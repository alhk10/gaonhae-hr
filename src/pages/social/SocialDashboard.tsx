import Phase2Page from './_Phase2Page';

const SocialDashboard = () => (
  <Phase2Page
    title="Social Media Dashboard"
    description="At-a-glance view of upcoming posts, approvals, failures, and content performance across Perth and Singapore."
    features={[
      'Upcoming scheduled posts',
      'Posts awaiting approval',
      'Recently failed publishes with retry',
      'Content performance highlights',
      'Quick-create shortcut',
      'AI suggestion preview cards',
    ]}
  />
);

export default SocialDashboard;
