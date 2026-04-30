import { Link } from 'react-router-dom';
import { ReactNode } from 'react';
import { ArrowRight } from 'lucide-react';
import SocialLayout from '@/components/layout/SocialLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

const Phase2Page = ({
  title,
  description,
  features,
}: {
  title: string;
  description: string;
  features: string[];
}) => (
  <SocialLayout title={title} description={description}>
    <Card className="border-dashed">
      <CardHeader>
        <div className="flex items-center gap-2">
          <CardTitle className="text-lg">Coming in Phase 2</CardTitle>
          <Badge variant="secondary">Planned</Badge>
        </div>
        <CardDescription>
          The foundation is in place. The features below activate once Instagram publishing &amp; the
          scheduler worker are wired up.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <ul className="grid sm:grid-cols-2 gap-2">
          {features.map((f) => (
            <li key={f} className="flex items-start gap-2 text-sm">
              <span className="mt-1 h-1.5 w-1.5 rounded-full bg-primary shrink-0" />
              <span>{f}</span>
            </li>
          ))}
        </ul>
        <div className="flex flex-wrap gap-2 pt-2">
          <Button asChild>
            <Link to="/social/create">
              Create a post <ArrowRight className="ml-1 h-4 w-4" />
            </Link>
          </Button>
          <Button asChild variant="outline">
            <Link to="/social/brand">Configure brand voice</Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  </SocialLayout>
);

export default Phase2Page;
