import { Model, DataTypes, Optional } from 'sequelize';
import { sequelize } from '../config/database';
import bcrypt from 'bcrypt';

export interface UserAttributes {
  id: number;
  email: string;
  password: string;
  name: string;
  telegramId?: string;
  settings?: Record<string, any>;
  status: 'active' | 'inactive';
  createdAt?: Date;
  updatedAt?: Date;
}

export interface UserCreationAttributes extends Optional<UserAttributes, 'id' | 'settings' | 'status'> {}

export class User extends Model<UserAttributes, UserCreationAttributes> implements UserAttributes {
  public id!: number;
  public email!: string;
  public password!: string;
  public name!: string;
  public telegramId!: string;
  public settings!: Record<string, any>;
  public status!: 'active' | 'inactive';

  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;

  public async comparePassword(candidatePassword: string): Promise<boolean> {
    return bcrypt.compare(candidatePassword, this.password);
  }
}

User.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true
    },
    email: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
      validate: {
        isEmail: true
      }
    },
    password: {
      type: DataTypes.STRING,
      allowNull: false
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false
    },
    telegramId: {
      type: DataTypes.STRING,
      allowNull: true,
      unique: true
    },
    settings: {
      type: DataTypes.JSON,
      allowNull: true
    },
    status: {
      type: DataTypes.ENUM('active', 'inactive'),
      defaultValue: 'active'
    }
  },
  {
    sequelize,
    tableName: 'users',
    modelName: 'User'
  }
);

export default User; 