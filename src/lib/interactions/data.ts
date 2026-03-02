/**
 * Curated drug interaction database for common chemo and supportive care medications.
 * This is a local lookup table — no external API calls.
 * Can be upgraded to OpenFDA/RxNorm in a future version.
 *
 * Drug names are stored in lowercase for case-insensitive matching.
 * Each entry is a pair of drugs with their interaction details.
 */

export interface DrugInteractionEntry {
  drug1: string
  drug2: string
  severity: 'MINOR' | 'MODERATE' | 'MAJOR' | 'CONTRAINDICATED'
  description: string
  recommendation: string
}

export const INTERACTION_DATABASE: DrugInteractionEntry[] = [
  // Chemo + anticoagulant interactions
  { drug1: 'fluorouracil', drug2: 'warfarin', severity: 'MAJOR', description: 'Fluorouracil can significantly increase the anticoagulant effect of warfarin, increasing bleeding risk.', recommendation: 'Monitor INR closely. Dose adjustment of warfarin may be needed.' },
  { drug1: 'capecitabine', drug2: 'warfarin', severity: 'MAJOR', description: 'Capecitabine can markedly increase warfarin levels, leading to dangerous bleeding.', recommendation: 'Avoid combination if possible. Monitor INR very frequently.' },
  { drug1: 'methotrexate', drug2: 'warfarin', severity: 'MODERATE', description: 'Methotrexate may enhance anticoagulant effect of warfarin.', recommendation: 'Monitor INR regularly during concurrent use.' },

  // Chemo + NSAID interactions
  { drug1: 'methotrexate', drug2: 'ibuprofen', severity: 'MAJOR', description: 'NSAIDs can reduce renal clearance of methotrexate, leading to toxic levels.', recommendation: 'Avoid NSAIDs during methotrexate treatment. Use acetaminophen instead.' },
  { drug1: 'methotrexate', drug2: 'naproxen', severity: 'MAJOR', description: 'Naproxen can reduce renal clearance of methotrexate, leading to toxic levels.', recommendation: 'Avoid NSAIDs during methotrexate treatment.' },
  { drug1: 'methotrexate', drug2: 'aspirin', severity: 'MODERATE', description: 'Aspirin can decrease methotrexate clearance and increase toxicity risk.', recommendation: 'Monitor for methotrexate toxicity. Low-dose aspirin may be acceptable.' },

  // Chemo + antifungal interactions
  { drug1: 'cyclophosphamide', drug2: 'fluconazole', severity: 'MODERATE', description: 'Fluconazole may inhibit metabolism of cyclophosphamide, affecting efficacy.', recommendation: 'Monitor for increased cyclophosphamide toxicity.' },
  { drug1: 'vincristine', drug2: 'itraconazole', severity: 'MAJOR', description: 'Itraconazole inhibits CYP3A4, which can significantly increase vincristine levels and neurotoxicity.', recommendation: 'Avoid concurrent use. Use alternative antifungal.' },
  { drug1: 'docetaxel', drug2: 'ketoconazole', severity: 'MAJOR', description: 'Ketoconazole can dramatically increase docetaxel levels through CYP3A4 inhibition.', recommendation: 'Avoid concurrent use. Use alternative antifungal.' },

  // Chemo + PPI interactions
  { drug1: 'methotrexate', drug2: 'omeprazole', severity: 'MODERATE', description: 'PPIs may reduce renal elimination of methotrexate, especially at high doses.', recommendation: 'Consider using H2 blockers instead during high-dose methotrexate.' },
  { drug1: 'methotrexate', drug2: 'pantoprazole', severity: 'MODERATE', description: 'PPIs may reduce renal elimination of methotrexate.', recommendation: 'Monitor methotrexate levels during concurrent use.' },
  { drug1: 'capecitabine', drug2: 'omeprazole', severity: 'MINOR', description: 'PPIs may slightly reduce absorption of capecitabine.', recommendation: 'Take capecitabine with food as directed. Usually not clinically significant.' },

  // Chemo + antibiotic interactions
  { drug1: 'methotrexate', drug2: 'trimethoprim', severity: 'CONTRAINDICATED', description: 'Trimethoprim can cause severe, potentially fatal, pancytopenia when used with methotrexate.', recommendation: 'Do NOT use together. Use alternative antibiotic.' },
  { drug1: 'methotrexate', drug2: 'penicillin', severity: 'MODERATE', description: 'Penicillins can reduce renal clearance of methotrexate.', recommendation: 'Monitor methotrexate levels during concurrent use.' },
  { drug1: 'fluorouracil', drug2: 'metronidazole', severity: 'MODERATE', description: 'Metronidazole may increase fluorouracil toxicity.', recommendation: 'Monitor for increased GI toxicity and myelosuppression.' },

  // Chemo + steroid interactions
  { drug1: 'dexamethasone', drug2: 'aprepitant', severity: 'MODERATE', description: 'Aprepitant inhibits CYP3A4, increasing dexamethasone exposure.', recommendation: 'Reduce dexamethasone dose by 50% when given with aprepitant.' },

  // Supportive care interactions
  { drug1: 'ondansetron', drug2: 'aprepitant', severity: 'MINOR', description: 'The combination is commonly used but aprepitant can modestly increase ondansetron levels.', recommendation: 'Generally safe. No dose adjustment typically needed.' },
  { drug1: 'ondansetron', drug2: 'tramadol', severity: 'MODERATE', description: 'Both affect serotonin levels, increasing risk of serotonin syndrome.', recommendation: 'Monitor for serotonin syndrome symptoms (agitation, tremor, diarrhea).' },
  { drug1: 'ondansetron', drug2: 'methadone', severity: 'MODERATE', description: 'Both can prolong QT interval, increasing risk of cardiac arrhythmia.', recommendation: 'ECG monitoring recommended. Consider alternative antiemetic.' },

  // Pain medication interactions
  { drug1: 'morphine', drug2: 'gabapentin', severity: 'MODERATE', description: 'Combined CNS depression can cause excessive sedation and respiratory depression.', recommendation: 'Start gabapentin at low dose. Monitor for excessive sedation.' },
  { drug1: 'oxycodone', drug2: 'diazepam', severity: 'MAJOR', description: 'Combined opioid and benzodiazepine use significantly increases risk of respiratory depression and death.', recommendation: 'Avoid combination if possible. Use lowest effective doses if necessary.' },
  { drug1: 'fentanyl', drug2: 'fluconazole', severity: 'MAJOR', description: 'Fluconazole inhibits CYP3A4, which can dramatically increase fentanyl levels.', recommendation: 'Reduce fentanyl dose or use alternative antifungal.' },
  { drug1: 'morphine', drug2: 'lorazepam', severity: 'MAJOR', description: 'Combined opioid and benzodiazepine use increases risk of severe sedation and respiratory depression.', recommendation: 'Avoid combination if possible. Monitor closely.' },

  // Immunosuppressant interactions
  { drug1: 'tacrolimus', drug2: 'fluconazole', severity: 'MAJOR', description: 'Fluconazole inhibits tacrolimus metabolism, causing potentially toxic levels.', recommendation: 'Monitor tacrolimus levels closely. Dose reduction usually needed.' },
  { drug1: 'cyclosporine', drug2: 'methotrexate', severity: 'MODERATE', description: 'Both are immunosuppressive and nephrotoxic. Combined risk is additive.', recommendation: 'Monitor renal function and blood counts closely.' },

  // Chemo + chemo interactions
  { drug1: 'cisplatin', drug2: 'methotrexate', severity: 'MAJOR', description: 'Cisplatin reduces renal clearance of methotrexate, increasing toxicity risk.', recommendation: 'Give methotrexate before cisplatin if used together. Monitor closely.' },
  { drug1: 'doxorubicin', drug2: 'trastuzumab', severity: 'MAJOR', description: 'Both cause cardiotoxicity. Combined use significantly increases heart failure risk.', recommendation: 'Avoid concurrent use. Sequential administration preferred.' },
  { drug1: 'paclitaxel', drug2: 'cisplatin', severity: 'MODERATE', description: 'Sequence matters: cisplatin before paclitaxel increases myelosuppression.', recommendation: 'Give paclitaxel before cisplatin to reduce toxicity.' },

  // Targeted therapy interactions
  { drug1: 'imatinib', drug2: 'ketoconazole', severity: 'MAJOR', description: 'Ketoconazole increases imatinib exposure through CYP3A4 inhibition.', recommendation: 'Avoid concurrent use. Use alternative antifungal.' },
  { drug1: 'imatinib', drug2: 'warfarin', severity: 'MAJOR', description: 'Imatinib can affect warfarin metabolism unpredictably.', recommendation: 'Use low-molecular-weight heparin instead of warfarin.' },
  { drug1: 'erlotinib', drug2: 'omeprazole', severity: 'MODERATE', description: 'PPIs reduce erlotinib absorption due to pH-dependent solubility.', recommendation: 'Avoid PPIs. If needed, stagger doses (erlotinib 12h before PPI).' },

  // Common supplement interactions
  { drug1: 'methotrexate', drug2: 'folic acid', severity: 'MINOR', description: 'Folic acid supplementation can reduce methotrexate efficacy as an antifolate.', recommendation: 'Use leucovorin rescue as prescribed. Discuss folic acid timing with oncologist.' },
  { drug1: 'cisplatin', drug2: 'magnesium', severity: 'MINOR', description: 'Cisplatin causes significant magnesium wasting.', recommendation: 'Magnesium supplementation is generally recommended with cisplatin.' },
  { drug1: 'doxorubicin', drug2: 'coenzyme q10', severity: 'MINOR', description: 'CoQ10 may provide some cardioprotection but could theoretically reduce doxorubicin efficacy.', recommendation: 'Discuss with oncologist before supplementing.' },
]
