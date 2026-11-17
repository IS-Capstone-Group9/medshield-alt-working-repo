"""Render offline scenario figures from executed, source-bound pilot outputs."""
import argparse,json
from pathlib import Path
import numpy as np
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt


def plot(simulation,sensitivity):
    simulation,sensitivity=map(Path,(simulation,sensitivity))
    result=json.loads((simulation/'execution/results.json').read_bytes())
    samples=json.loads((simulation/'execution/sample-ledgers.json').read_bytes())['rows']
    raw=json.loads((simulation/'execution/run-metrics.json').read_bytes())['rows']
    fig,axes=plt.subplots(3,1,figsize=(11,8),sharex=True,constrained_layout=True)
    for axis,sample in zip(axes,samples):
        days=range(len(sample['daily']))
        axis.plot(days,[r['closing'] for r in sample['daily']],label='Simulated closing stock',color='#335f78')
        axis.step(days,[r['demand'] for r in sample['daily']],label='Sampled fulfilled-sales demand path',color='#a16d33',alpha=.65)
        axis.set_title(sample['policy']+' — simulation replicate 0; assumed opening/receipts/expiry')
        axis.set_ylabel('Ampoules');axis.legend(loc='upper right',fontsize=8)
    axes[-1].set_xlabel('Days since 1 April 2026')
    fig.savefig(simulation/'F11.1_simulated_inventory_trajectories.png',dpi=140);plt.close(fig)
    base={p:[r['wastage_pct'] for r in raw if r['shelf_days']==365 and r['lead_days']==14 and r['policy']==p] for p in ('P0','P1','P2')}
    fig,axis=plt.subplots(figsize=(9,4),constrained_layout=True)
    axis.boxplot(list(base.values()),tick_labels=list(base))
    axis.set_ylim(-.25,1);axis.set_ylabel('Simulated expiry wastage (%)')
    axis.set_title('All 1,000 base-case replicates have zero expiry within this short window')
    axis.text(.5,.78,'Six-month evaluation; long assumed shelf life.\nThis does not establish actual ≤5% wastage or avoided losses.',transform=axis.transAxes,ha='center')
    fig.savefig(simulation/'F11.2_wastage_distribution_boxplot.png',dpi=140);plt.close(fig)
    fig,axes=plt.subplots(1,3,figsize=(12,4),constrained_layout=True)
    for axis,p in zip(axes,('P0','P1','P2')):
        values=[[next(r['mean'] for r in result['rows'] if r['policy']==p and r['metric']=='wastage_pct' and r['shelf_days']==s and r['lead_days']==l) for l in (7,14,30)] for s in (180,365,730)]
        chart=axis.imshow(values,vmin=0,vmax=5,cmap='YlOrRd',aspect='auto')
        axis.set_xticks(range(3),[7,14,30]);axis.set_yticks(range(3),[180,365,730])
        axis.set_xlabel('Assumed mean lead (days)');axis.set_ylabel('Assumed shelf life (days)');axis.set_title(p+' simulated wastage (%)')
        for i in range(3):
            for j in range(3):axis.text(j,i,f'{values[i][j]:.1f}',ha='center',va='center')
    fig.colorbar(chart,ax=axes,shrink=.75,label='Mean simulated wastage (%)')
    fig.savefig(simulation/'F11.3_expiry_sensitivity_heatmap.png',dpi=140);plt.close(fig)
    scenarios=json.loads((sensitivity/'execution/results.json').read_bytes())
    base=scenarios['base_inputs'];fields=list(scenarios['ranges'])
    labels=[];low=[];high=[]
    for field in fields:
        rows=[r for r in scenarios['rows'] if all(abs(r[k]-v)<1e-12 for k,v in base.items() if k!=field)]
        labels.append(field);low.append(min(r['order_units'] for r in rows));high.append(max(r['order_units'] for r in rows))
    fig,axes=plt.subplots(1,2,figsize=(11,4),constrained_layout=True)
    axes[0].barh(labels,np.asarray(high)-np.asarray(low),left=low,color='#335f78');axes[0].set_xlabel('Scenario EOQ (ampoules)')
    for field in fields:
        rows=[r for r in scenarios['rows'] if all(abs(r[k]-v)<1e-12 for k,v in base.items() if k!=field)]
        values=[r['reorder_point_units'] for r in rows]
        axes[1].barh(field,max(values)-min(values),left=min(values),color='#a16d33')
    axes[1].set_xlabel('Scenario ROP (ampoules)');fig.suptitle('One-at-a-time A1–A5 ranges; all operating inputs assumed')
    fig.savefig(sensitivity/'F8.1_eoq_rop_tornado_sensitivity.png',dpi=140);plt.close(fig)
    holding=scenarios['ranges']['holding_fraction'];lead=scenarios['ranges']['lead_days']
    values=[]
    for h in holding:
        values.append([next(r['annual_ordering_cycle_holding_cost'] for r in scenarios['rows'] if r['holding_fraction']==h and r['lead_days']==l and r['order_cost']==base['order_cost'] and r['lead_sd_days']==base['lead_sd_days'] and abs(r['service_z']-base['service_z'])<1e-12) for l in lead])
    fig,axis=plt.subplots(figsize=(9,4),constrained_layout=True)
    chart=axis.imshow(values,aspect='auto',cmap='Blues');axis.set_xticks(range(len(lead)),lead)
    axis.set_yticks(range(len(holding)),[f'{v:.0%}' for v in holding]);axis.set_xlabel('Assumed lead (days)');axis.set_ylabel('Assumed annual holding fraction')
    axis.set_title('Ordering + cycle holding model cost; formula excludes lead-time costs')
    fig.colorbar(chart,ax=axis,label='Scenario PHP/year; not measured company expense')
    fig.savefig(sensitivity/'F8.2_cost_heatmap_lead_vs_holding.png',dpi=140);plt.close(fig)


if __name__=='__main__':
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--simulation',type=Path,required=True);parser.add_argument('--sensitivity',type=Path,required=True)
    args=parser.parse_args();plot(args.simulation,args.sensitivity)
