"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isAggregationMode = void 0;
const isAggregationMode = (value) => value === 'exact_union' || value === 'add_missing';
exports.isAggregationMode = isAggregationMode;
