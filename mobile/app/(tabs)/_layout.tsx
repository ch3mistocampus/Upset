import { Tabs } from 'expo-router';
import { FloatingTabBar } from '../../components/navigation/FloatingTabBar';
import { useTheme } from '../../lib/theme';

export default function TabsLayout() {
  const { colors } = useTheme();

  return (
    <Tabs
      tabBar={(props) => <FloatingTabBar {...props} />}
      screenOptions={{
        headerStyle: {
          backgroundColor: colors.surface,
        },
        headerTintColor: colors.textPrimary,
        headerTitleStyle: {
          fontWeight: 'bold',
        },
        // Hide default tab bar (we're using FloatingTabBar)
        tabBarStyle: { display: 'none' },
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          title: 'Home',
        }}
      />
      <Tabs.Screen
        name="pick"
        options={{
          title: 'Make Picks',
        }}
      />
      <Tabs.Screen
        name="discover"
        options={{
          title: 'Discover',
        }}
      />
      <Tabs.Screen
        name="friends"
        options={{
          title: 'Friends',
          href: null, // Hidden from tab bar, accessible via navigation
        }}
      />
      <Tabs.Screen
        name="leaderboards"
        options={{
          title: 'Leaderboard',
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
        }}
      />
    </Tabs>
  );
}
