"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Alibaba1688Module = void 0;
const common_1 = require("@nestjs/common");
const alibaba_1688_controller_1 = require("./alibaba-1688.controller");
const alibaba_1688_service_1 = require("./alibaba-1688.service");
let Alibaba1688Module = class Alibaba1688Module {
};
exports.Alibaba1688Module = Alibaba1688Module;
exports.Alibaba1688Module = Alibaba1688Module = __decorate([
    (0, common_1.Module)({
        controllers: [alibaba_1688_controller_1.Alibaba1688Controller],
        providers: [alibaba_1688_service_1.Alibaba1688Service],
        exports: [alibaba_1688_service_1.Alibaba1688Service],
    })
], Alibaba1688Module);
//# sourceMappingURL=alibaba-1688.module.js.map