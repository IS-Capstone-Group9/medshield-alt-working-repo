# Prescriptive Analytics Logic

> **Current boundary:** MedShield has historical ranking and a user-entered scenario solver. It has no approved live inventory or procurement feed. See [Current State](../CURRENT_STATE.md).

## Objective

Help a planner compare feasible allocation choices after demand evidence is accepted. Prescriptive outputs remain scenarios until operational inputs and governance exist.

## Required inputs

- approved demand or forecast;
- current on-hand and committed stock;
- lead time and variability;
- pack size and minimum order rules;
- unit/acquisition cost, ordering cost, and holding cost;
- supplier constraints;
- service-level or reserve policy;
- budget and planning horizon;
- expiry or shelf-life constraints when expiry claims are made.

If an input is unavailable, it must be entered as a visible scenario assumption or the corresponding output must remain unavailable.

## Current scenario flow

1. Databricks supplies the historical product shortlist and ranking evidence.
2. The user enters demand, stock, reserve, pack, cost, supplier, budget, and horizon assumptions.
3. The gateway validates the assumptions and reports feasible/infeasible results.
4. The UI labels the result as a scenario and requires human review.

## Method boundaries

- EOQ requires annual demand, ordering cost, and holding cost.
- ROP and safety stock require demand variation, lead time, and service level.
- Allocation optimization requires an explicit objective and constraints.
- MCDA weights must be visible and sensitivity-tested.
- Disease/weather alerts remain historical or scenario context unless an authoritative current feed and alert policy are approved.

No result creates or approves a purchase order.
