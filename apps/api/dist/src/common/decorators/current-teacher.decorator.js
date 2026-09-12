"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CurrentTeacher = void 0;
const common_1 = require("@nestjs/common");
exports.CurrentTeacher = (0, common_1.createParamDecorator)((_data, context) => {
    const request = context.switchToHttp().getRequest();
    return request.teacher;
});
//# sourceMappingURL=current-teacher.decorator.js.map