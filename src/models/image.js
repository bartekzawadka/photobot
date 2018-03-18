module.exports = function(sequelize, DataTypes){
    let image = sequelize.define("Image", {
        id: {type: DataTypes.BIGINT, allowNull: false, primaryKey: true, autoIncrement: true},
        thumbnail: {type: DataTypes.TEXT, allowNull: true},
        createdAt:{type: DataTypes.DATE, allowNull: true}
    });

    image.hasMany(sequelize.models.Chunk, { as: 'chunks', foreignKey: { name: 'imageId', allowNull: false }, onDelete: 'CASCADE' });
    sequelize.models.Chunk.belongsTo(image, { as: 'chunks', foreignKey: { name:'imageId', allowNull: false }, onDelete: 'CASCADE' });

    return image;
};