export type Severity = "critical" | "urgent" | "mild";

export interface ProtocolStep {
    id:          number;
    instruction: string;
    duration?:   number;
    warning?:    string;
}

export interface DecisionNode {
    id:       string;
    question: string;
    yes:      string | ProtocolStep[];
    no:       string | ProtocolStep[];
}

export interface Protocol {
    id:                 string;
    title:              string;
    severity:           Severity;
    category:           string;
    keywords:           string[];
    symptoms:           string[];
    steps:              ProtocolStep[];
    warnings:           string[];
    decisionTree?:      DecisionNode[];
    callEmergency:      boolean;
    estimatedTime?:     number;
    priorityKeywords?:  string[];
    aliases?:           string[];
    emergencyTriggers?: string[];
}

export interface SearchResult {
    protocol: Protocol;
    score:    number;
}
