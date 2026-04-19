"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PaidFeaturesModule = void 0;
const common_1 = require("@nestjs/common");
const paid_features_controller_1 = require("./paid-features.controller");
const paid_features_service_1 = require("./paid-features.service");
let PaidFeaturesModule = class PaidFeaturesModule {
};
exports.PaidFeaturesModule = PaidFeaturesModule;
exports.PaidFeaturesModule = PaidFeaturesModule = __decorate([
    (0, common_1.Module)({
        controllers: [paid_features_controller_1.PaidFeaturesController],
        providers: [paid_features_service_1.PaidFeaturesService],
        exports: [paid_features_service_1.PaidFeaturesService],
    })
], PaidFeaturesModule);
//# sourceMappingURL=paid-features.module.js.map