const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");
const User = require("./User");

const Group = sequelize.define("Group", {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  name: { type: DataTypes.STRING, allowNull: false },
  invite_code: { type: DataTypes.STRING(6), unique: true, allowNull: false },
  initial_balance: { type: DataTypes.DECIMAL(15, 2), defaultValue: 100000 },
  duration: { type: DataTypes.ENUM("24h", "48h", "5d"), allowNull: false },
  starts_at: { type: DataTypes.DATE },
  ends_at: { type: DataTypes.DATE },
  status: {
    type: DataTypes.ENUM("waiting", "active", "ended"),
    defaultValue: "waiting",
  },
});

User.hasMany(Group, { foreignKey: "created_by" });
Group.belongsTo(User, { foreignKey: "created_by", as: "creator" });

module.exports = Group;
