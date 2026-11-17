import copy
import csv
import json
from pathlib import Path
from tempfile import TemporaryDirectory
import unittest

from services.analytics_service.jobs.run_ahp_mcda_sensitivity import evaluate,run


def fixture():
    return dict(dataset_id='synthetic_wp10_contract_fixture',policy_version='wp10_explicit_criteria_v1',
        scope='Synthetic product cohort, no real territory or disease linkage',input_provenance='Synthetic criterion vectors; no company findings',
        evidence_kind='synthetic_fixture',as_of='2026-10-01',window_start='2025-10-01',window_end='2026-09-30',
        base_year=2025,target_year=2026,matched_months=list(range(1,10)),source_bindings=[],reviews={},dii_scale_ceiling=3,
        pairwise_matrix=[[1,2,4],[.5,1,2],[.25,.5,1]],items=[dict(product_key=f'fixture_{i:02}',product=f'Synthetic item {i:02}',
        revenue_12m=(i+1)**2*1000,matched_base_net=1000,matched_target_net=1000*(1+(((i*7)%15)-7)*.05),
        matched_months=list(range(1,10)),disease_linkage='reviewed_linked',dii=((i*11)%19)/6) for i in range(15)])


class AhpMcdaJobTests(unittest.TestCase):
    def test_normalization_matrix_and_complete_probe_grid(self):
        payload=fixture();before=copy.deepcopy(payload);result=evaluate(payload)
        self.assertEqual(payload,before);self.assertEqual(len(result['rankings']),15);self.assertEqual(len(result['probes']),31)
        self.assertEqual(sum(r['probe'].startswith('grid_') for r in result['probes']),25)
        self.assertAlmostEqual(result['ahp']['weights'][0],4/7)
        self.assertAlmostEqual(result['ahp']['consistency_ratio'],0)
        self.assertAlmostEqual(result['normalization']['winsor_p5'],-31.5)
        for row in result['rankings']:
            for field in ('revenue_score','growth_score','outbreak_score'):self.assertTrue(0<=row[field]<=100)
        self.assertEqual(result['status'],'EXECUTED_SYNTHETIC_WP10_METHOD_ONLY');self.assertFalse(result['full_wp10_complete'])
    def test_missing_disease_or_bad_matrix_does_not_produce_a_rank(self):
        for case in ('missing_dii','missing_link','inconsistent','real_unreviewed','future','months','nonfinite','duplicate'):
            p=fixture()
            if case=='missing_dii':p['items'][0]['dii']=None
            if case=='missing_link':p['items'][0]['disease_linkage']='pending_external_join'
            if case=='inconsistent':p['pairwise_matrix']=[[1,9,1/9],[1/9,1,9],[9,1/9,1]]
            if case=='real_unreviewed':p['evidence_kind']='reviewed_candidate'
            if case=='future':p['matched_months']=[10]
            if case=='months':p['items'][0]['matched_months']=[1]
            if case=='nonfinite':p['items'][0]['revenue_12m']=float('nan')
            if case=='duplicate':p['items'][0]['product_key']=p['items'][1]['product_key']
            with self.subTest(case=case),self.assertRaises(ValueError):evaluate(p)
    def test_constant_criteria_ties_and_signed_exclusion_are_explicit(self):
        p=fixture()
        for item in p['items']:
            item.update(revenue_12m=1000,matched_target_net=1000,disease_linkage='reviewed_not_linked',dii=None)
        p['items'][0]['revenue_12m']=-100
        result=evaluate(p)
        self.assertEqual(len(result['excluded']),1);self.assertTrue(result['normalization']['revenue']['constant'])
        self.assertTrue(all(r['spearman_rho'] is None for r in result['probes']))
        self.assertFalse(result['sensitivity_gate_passed']);self.assertTrue(all(r['outbreak_score']==0 for r in result['rankings']))
    def test_full_job_hashes_csv_and_overwrite_binding_rejection(self):
        with TemporaryDirectory() as folder:
            root=Path(folder);source=root/'input.json';source.write_text(json.dumps(fixture()),encoding='utf-8');output=root/'result'
            result=run(source,output);self.assertEqual(len(result['input_sha256']),64)
            self.assertTrue((output/'T10.3_weight_perturbation_spearman.csv').exists())
            with (output/'T10.2_mcda_priority_ranking.csv').open(encoding='utf-8-sig',newline='') as f:row=next(csv.DictReader(f))
            self.assertEqual(row['evidence_label'],'Simulated');self.assertEqual(row['input_sha256'],result['input_sha256'])
            self.assertEqual(row['business_publication_approved'],'False')
            with self.assertRaises(FileExistsError):run(source,output)
            p=fixture();p['source_bindings']=[dict(path='input.json',sha256='0'*64)];other=root/'bad.json';other.write_text(json.dumps(p),encoding='utf-8')
            with self.assertRaisesRegex(ValueError,'binding mismatch'):run(other,root/'unwritten')
            self.assertFalse((root/'unwritten').exists())
    def test_reviewed_candidate_requires_all_binding_roles_and_never_grants_approval(self):
        p=fixture();p['evidence_kind']='reviewed_candidate';p['reviews']={k:True for k in ('criteria_reviewed','disease_linkage_reviewed','external_join_approved','availability_reviewed')}
        p['source_bindings']=[dict(role='criteria')]
        with self.assertRaisesRegex(ValueError,'distinct roles'):evaluate(p)
        p['source_bindings']=[dict(role=k) for k in ('criteria','disease_mapping','external_availability','review')]
        result=evaluate(p)
        self.assertFalse(result['business_publication_approved']);self.assertFalse(result['operational_approval'])
        self.assertFalse(result['full_wp10_complete'])


if __name__=='__main__':unittest.main()
