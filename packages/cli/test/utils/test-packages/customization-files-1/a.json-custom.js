module.exports = ({ firstProperty, secondProperty }) => {
  return {
    firstProperty: Object.entries(firstProperty)
      .map(([key, value]) => [`custom${key}`, !value])
      .reduce((map, [key, value]) => {
        map[key] = value;
        return map;
      }, {}),
    secondProperty: 1000 + secondProperty,
    thirdProperty: null,
  };
};
