import Phase2Page from './_Phase2Page';

const ContentCalendar = () => (
  <Phase2Page
    title="Content Calendar"
    description="Monthly view of your Instagram pipeline with drag-and-drop rescheduling."
    features={[
      'Month / week views',
      'Drag-and-drop to reschedule',
      'Color-coded by content type',
      'Branch filtering',
      'Click to edit caption + media',
    ]}
  />
);

export default ContentCalendar;
