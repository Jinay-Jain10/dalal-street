const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const Group = require('./Group');
const User = require('./User');

const GroupTransaction = sequelize.define('GroupTransaction', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  symbol: { type: DataTypes.STRING, allowNull: false },
  company_name: { type: DataTypes.STRING, allowNull: false },
  type: { type: DataTypes.ENUM('BUY', 'SELL'), allowNull: false },
  quantity: { type: DataTypes.INTEGER, allowNull: false },
  price_at_transaction: { type: DataTypes.DECIMAL(15, 2), allowNull: false },
  total_value: { type: DataTypes.DECIMAL(15, 2), allowNull: false },
});

Group.hasMany(GroupTransaction, { foreignKey: 'group_id' });
GroupTransaction.belongsTo(Group, { foreignKey: 'group_id' });

User.hasMany(GroupTransaction, { foreignKey: 'user_id' });
GroupTransaction.belongsTo(User, { foreignKey: 'user_id' });

module.exports = GroupTransaction;