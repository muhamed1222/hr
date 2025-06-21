"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const sequelize_1 = require("sequelize");
const database_1 = require("../config/database");
const User_1 = __importDefault(require("./User"));
class Company extends sequelize_1.Model {
}
Company.init({
    id: {
        type: sequelize_1.DataTypes.UUID,
        defaultValue: sequelize_1.DataTypes.UUIDV4,
        primaryKey: true,
    },
    name: {
        type: sequelize_1.DataTypes.STRING,
        allowNull: false,
        unique: true,
        validate: {
            notEmpty: true,
        },
    },
}, {
    sequelize: database_1.sequelize,
    modelName: 'Company',
    tableName: 'companies',
});
// Define associations
Company.hasMany(User_1.default, {
    foreignKey: 'company_id',
    as: 'users',
});
User_1.default.belongsTo(Company, {
    foreignKey: 'company_id',
    as: 'company',
});
exports.default = Company;
