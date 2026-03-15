const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const Group = require('./Group');
const User = require('./User');

const BattleMessage = sequelize.define('BattleMessage', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  message: { type: DataTypes.TEXT, allowNull: false },
});

Group.hasMany(BattleMessage, { foreignKey: 'group_id' });
BattleMessage.belongsTo(Group, { foreignKey: 'group_id' });

User.hasMany(BattleMessage, { foreignKey: 'user_id' });
BattleMessage.belongsTo(User, { foreignKey: 'user_id' });

module.exports = BattleMessage;