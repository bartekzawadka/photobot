module.exports = function(sequelize, DataTypes){
    let chunk = sequelize.define("Chunk", {
        id: {type: DataTypes.BIGINT, allowNull: false, primaryKey: true, autoIncrement: true},
        index: {type: DataTypes.INTEGER, allowNull: false},
        data: {type: DataTypes.BLOB('medium'), allowNull: false}
    });

    return chunk;
};