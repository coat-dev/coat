module.exports = ({ firstProperty, secondProperty }) => {
  return {
    firstProperty: Object.entries(firstProperty)
      .map(([key, value]) => [`custom${key}`, !value])
      .reduce((accumulator, [key, value]) => {
        accumulator[key] = value;
        return accumulator;
      }, {}),
    secondProperty: 1000 + secondProperty,
    thirdProperty: null,
  };
};
