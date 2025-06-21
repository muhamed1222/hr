import { Model, DataTypes } from 'sequelize';
import { sequelize } from '../config/database';
import User from './User';

class Company extends Model {
  public id!: string;
  public name!: string;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

Company.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
      validate: {
        notEmpty: true,
      },
    },
  },
  {
    sequelize,
    modelName: 'Company',
    tableName: 'companies',
  }
);

// Define associations
Company.hasMany(User, {
  foreignKey: 'company_id',
  as: 'users',
});

User.belongsTo(Company, {
  foreignKey: 'company_id',
  as: 'company',
});

export default Company; 