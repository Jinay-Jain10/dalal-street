const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const User = require('./User');

const Watchlist = sequelize.define('Watchlist', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  symbol: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  company_name: {
    type: DataTypes.STRING,
    allowNull: false,
  },
});

User.hasMany(Watchlist, { foreignKey: 'user_id' });
Watchlist.belongsTo(User, { foreignKey: 'user_id' });

module.exports = Watchlist;