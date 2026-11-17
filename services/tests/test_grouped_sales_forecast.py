import copy
import hashlib
from pathlib import Path
import tempfile
import unittest

from services.analytics_service.predictive import grouped_sales_forecast as model
from services.analytics_service.predictive.contracts import month, period
from services.analytics_service.jobs import run_grouped_sales_forecast as runner


def panel_fixture(n=48):
    result = {}
    for p in range(n):
        a, b = 100. + p + p % 5, -10. - p % 3
        cell = lambda label, amount: dict(raw_label=label, records=1, eligible_records=1,
            net_sales_php=str(amount), source_amount_null=False, row_present=True, zero_kind=None)
        result[p] = dict(company_net_sales_php=str(a + b), records=2, eligible_records=2,
            groups={'string:A': cell('A', a), 'string:B': cell('B', b)})
    return result


def source_fixture():
    identity = dict(dataset_id='a'*64, policy_version='test', source_table='workspace.test.fact',
        delta_version=0, receipt_sha256='b'*64, source_keys_sha256='c'*64,
        scope='original_itemized_sales_contracts_excluded')
    rows = []
    companies = []
    for p in range(24):
        date = period(month('2020-01') + p)
        # Two legitimate repeated positive records plus a signed correction.
        rows.extend([dict(month=date+'-01', normalized_area='A', records='2', eligible_records='2', revenue='20.00'),
                     dict(month=date+'-01', normalized_area='B', records='1', eligible_records='1', revenue='-2.00')])
        companies.append(dict(month=date, source_records='3', net_eligible_records='3', net_sales_php='18.00'))
    sql = 'fixture complete captured rowset partition'
    source = dict(source_identity=identity, monthly=companies)
    capture = dict(source='databricks', warehouse_writes=0, release=dict(original_itemized=identity),
        source_latest_version_before=0, source_latest_version_after=0,
        queries=dict(monthly_control=dict(sql=sql, sql_sha256=hashlib.sha256(sql.encode()).hexdigest(), rows=rows)))
    return capture, source


class GroupedForecastTests(unittest.TestCase):
    def test_signed_duplicate_conservation_and_no_overlap(self):
        capture, source = source_fixture()
        panel = model.reconcile(capture, source)
        frame = panel[month('2020-01')]
        self.assertEqual(frame['records'], 3)
        self.assertEqual(frame['company_net_sales_php'], '18.00')
        self.assertEqual(frame['groups']['string:A']['records'], 2)
        changed = copy.deepcopy(capture)
        changed['queries']['monthly_control']['rows'].append(changed['queries']['monthly_control']['rows'][0])
        with self.assertRaisesRegex(ValueError, 'Duplicate'):
            model.reconcile(changed, source)

    def test_wrong_source_counts_or_amounts_are_not_model_inputs(self):
        capture, source = source_fixture()
        for field, value in [('records', '3'), ('eligible_records', '1'), ('revenue', '99')]:
            changed = copy.deepcopy(capture); changed['queries']['monthly_control']['rows'][0][field] = value
            with self.assertRaises(ValueError):
                model.reconcile(changed, source)
        changed = copy.deepcopy(capture); changed['release']['original_itemized'] = dict(source['source_identity'], dataset_id='wrong')
        with self.assertRaisesRegex(ValueError, 'differs'):
            model.reconcile(changed, source)

    def test_absent_ineligible_subset_zero_is_not_unknown_company_month(self):
        capture, source = source_fixture()
        # Keep a captured but wholly ineligible B row. Its eligible subset is empty.
        for row in capture['queries']['monthly_control']['rows']:
            if row['normalized_area'] == 'B':
                row['eligible_records'] = '0'; row['revenue'] = None
        for row in source['monthly']:
            row['net_eligible_records'] = '2'; row['net_sales_php'] = '20.00'
        panel = model.reconcile(capture, source)
        cell = panel[month('2020-01')]['groups']['string:B']
        self.assertTrue(cell['source_amount_null']); self.assertEqual(cell['zero_kind'], 'empty_eligible_financial_rowset')
        changed = copy.deepcopy(source); changed['monthly'].pop(3)
        with self.assertRaisesRegex(ValueError, 'Contiguous'):
            model.reconcile(capture, changed)

    def test_no_future_label_or_value_changes_origin_prediction(self):
        panel = panel_fixture()
        for config in model.CONFIGS:
            before = model.predict(panel, 35, config)
            changed = copy.deepcopy(panel)
            changed[36] = dict(company_net_sales_php='99999999', records=1, eligible_records=1,
                groups={'string:FUTURE': dict(records=1, eligible_records=1, net_sales_php='99999999')})
            changed[47]['company_net_sales_php'] = 'NaN'
            self.assertEqual(before, model.predict(changed, 35, config))
            self.assertNotIn('string:FUTURE', [r['group_key'] for r in before[1]['groups']])

    def test_inner_cutoff_losses_selection_and_linear_control(self):
        panel = panel_fixture()
        for config in model.CONFIGS:
            value, trace = model.predict(panel, 47, config)
            self.assertLessEqual(trace['inner_target_end'], 47)
            self.assertEqual(trace['samples'], config['window'])
            for group in trace['groups']:
                losses = [sum(abs(row[i]-y) for row, y in zip(group['inner_predictions'], group['inner_actuals']))/trace['samples'] for i in range(4)]
                self.assertEqual(losses, group['mean_absolute_errors'])
                chosen = min(range(4), key=lambda i:(losses[i],i))
                self.assertEqual(group['selected_expert'], model.BASELINES[chosen])
            for a,b in zip(trace['linear_group_sums'],trace['company_baseline_predictions']): self.assertAlmostEqual(a,b,places=6)
            expected = trace['group_weight']*sum(g['prediction'] for g in trace['groups'])+(1-trace['group_weight'])*trace['company_baseline_predictions'][3]
            self.assertAlmostEqual(value,expected,places=6)

    def test_absent_group_is_explicit_additive_subset_only(self):
        panel=panel_fixture()
        for p in range(30):
            panel[p]['groups'].pop('string:B'); panel[p]['company_net_sales_php']=panel[p]['groups']['string:A']['net_sales_php']
            panel[p]['records']=panel[p]['eligible_records']=1
        _,trace=model.predict(panel,35,model.CONFIGS[0])
        group=next(g for g in trace['groups'] if g['group_key']=='string:B')
        self.assertEqual(group['first_captured_period'],30)
        self.assertEqual(group['absent_contribution_periods'],list(range(30)))
        self.assertIn('not_observed_zero',trace['zero_kind'])

    def test_null_blank_and_literal_labels_do_not_merge(self):
        self.assertEqual(len({model.label_key(None),model.label_key(''),model.label_key('null:')}),3)

    def test_invalid_calendar_or_recipe_fails_without_fallback(self):
        panel=panel_fixture();panel.pop(20)
        with self.assertRaises(ValueError):model.predict(panel,47,model.CONFIGS[0])
        with self.assertRaises(ValueError):model.predict(panel_fixture(),47,dict(model_id='unregistered',window=12,group_weight=1.))

    def test_registration_exclusive_and_partial_execution_refused(self):
        root=Path(__file__).resolve().parents[2]
        source=root/'outputs/wp4_forecast_tournament_20261030/source.json'
        groups=root/'outputs/original_so1_20261027/input/source.json'
        reference=root/'outputs/wp4_new_tournament_20261030/results.json'
        with tempfile.TemporaryDirectory() as directory:
            out=Path(directory)/'study'
            self.assertEqual(out.resolve().parent,Path(directory).resolve())
            runner.register(source,groups,reference,out)
            with self.assertRaises(FileExistsError):runner.register(source,groups,reference,out)
            (out/'partial.txt').write_text('retained')
            with self.assertRaisesRegex(ValueError,'overwrite'):runner.execute(source,groups,reference,out)


if __name__=='__main__':unittest.main()
