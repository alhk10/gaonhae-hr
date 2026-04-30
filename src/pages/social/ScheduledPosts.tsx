import Phase2Page from './_Phase2Page';

const ScheduledPosts = () => (
  <Phase2Page
    title="Scheduled Posts"
    description="Review, edit and reschedule every post in the queue, grouped by branch and status."
    features={[
      'Filter by branch / status / content type',
      'Inline reschedule with timezone awareness',
      'Approval &amp; publish actions',
      'Failure log with one-click retry',
    ]}
  />
);

export default ScheduledPosts;
