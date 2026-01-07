// Mock for @expo/vector-icons
const React = require('react');
const { Text } = require('react-native');

const createIconComponent = (name) => {
  const Component = ({ name: iconName, size, color, ...props }) => {
    return React.createElement(Text, { ...props }, iconName || name);
  };
  Component.displayName = name;
  return Component;
};

module.exports = {
  Ionicons: createIconComponent('Ionicons'),
  MaterialIcons: createIconComponent('MaterialIcons'),
  FontAwesome: createIconComponent('FontAwesome'),
  Feather: createIconComponent('Feather'),
  MaterialCommunityIcons: createIconComponent('MaterialCommunityIcons'),
};
