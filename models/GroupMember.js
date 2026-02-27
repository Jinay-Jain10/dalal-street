const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const Group = require('./Group');
const User = require('./User');

const GroupMember = sequelize.define('GroupMember', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  battle_balance: { type: DataTypes.DECIMAL(15, 2), allowNull: false },
  joined_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
});

Group.hasMany(GroupMember, { foreignKey: 'group_id' });
GroupMember.belongsTo(Group, { foreignKey: 'group_id' });

User.hasMany(GroupMember, { foreignKey: 'user_id' });
GroupMember.belongsTo(User, { foreignKey: 'user_id' });

module.exports = GroupMember;