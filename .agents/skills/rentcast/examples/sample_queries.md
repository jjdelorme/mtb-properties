# RentCast Skill Examples & Reference Queries

This document contains example CLI invocations and sample outputs for the RentCast skill tools.

---

## 1. Querying Active For-Sale Listings

```bash
python3 .agents/skills/rentcast/scripts/get_listings.py --zip 80401 --limit 3
```

**Output:**
```
Found 3 listing(s):

#   Address                                  Price        Beds   Baths  SqFt     Type             Status  
----------------------------------------------------------------------------------------------------------
1   670 Rooney Rd, Golden, CO 80401          $10,000,000  -      -      -        Land             Active  
2   166 S Terry St, Lot 23, Golden, CO 804   $906,941     3      1.5    3251     Single Family    Active  
3   880 Vivian St, Lakewood, CO 80401        $425,000     -      -      -        Land             Active  
```

---

## 2. Querying Property Valuation (AVM)

```bash
python3 .agents/skills/rentcast/scripts/get_valuation.py --address "166 S Terry St, Golden, CO 80401"
```

**Output:**
```
=== RentCast Property Valuation (AVM) ===
Estimated Value:      $909,000
Value Range:          $849,000 - $969,000

Comparable Sales (5 comps):
#   Address                                Sale Price   Dist (mi)  Beds   Baths  SqFt     Corr  
------------------------------------------------------------------------------------------------
1   129 S Terry St, Golden, CO 80401       $835,951     0.10       3      2      1699     1.00  
2   134 S Secrest St, Golden, CO 80401     $949,950     0.10       3      2      1699     1.00  
3   125 S Terry St, Golden, CO 80401       $825,435     0.11       3      2      1601     0.99  
4   162 S Terry St, Golden, CO 80401       $959,753     0.01       3      2.5    1824     0.96  
5   138 S Secrest St, Golden, CO 80401     $978,950     0.09       3      2.5    1824     0.96  
```

---

## 3. Querying Rental Yield Estimates

```bash
python3 .agents/skills/rentcast/scripts/get_rent_estimate.py --address "166 S Terry St, Golden, CO 80401"
```

**Output:**
```
=== RentCast Long-Term Rent Estimate ===
Estimated Monthly Rent: $2,790/mo
Rent Range:             $2,090/mo - $3,490/mo

Rental Comps (5 comps):
#   Address                                Rent         Dist (mi)  Beds   Baths  SqFt     Corr  
------------------------------------------------------------------------------------------------
1   227 Poppy St, Golden, CO 80401         $2,830/mo    0.75       3      2      1477     0.96  
2   1617 Salvia St, Apt 1, Golden, CO 80   $2,195/mo    2.17       3      2      1800     0.95  
3   573 Entrada Dr, Golden, CO 80401       $1,700/mo    1.45       3      2.5    1618     0.94  
4   755 Gardenia St, Golden, CO 80401      $3,500/mo    1.96       3      2      1500     0.94  
5   657 Somerset Dr, Golden, CO 80401      $3,750/mo    1.60       3      2.5    1878     0.93  
```

---

## 4. Seeding New Sandbox Data

```bash
python3 .agents/skills/rentcast/scripts/seed_sandbox_fixtures.py --zip 86336 --city Sedona --state AZ --limit 10
```
