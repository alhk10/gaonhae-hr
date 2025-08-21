/**
 * Student Emergency Contacts Component
 * Displays and manages emergency contact information
 */

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Phone, Mail, User, Shield } from 'lucide-react';
import { StudentEmergencyContact } from '@/services/studentService';

interface StudentEmergencyContactsProps {
  contacts: StudentEmergencyContact[];
  loading?: boolean;
}

export const StudentEmergencyContacts: React.FC<StudentEmergencyContactsProps> = ({
  contacts,
  loading = false
}) => {
  if (loading) {
    return (
      <Card className="border border-border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5" />
            Emergency Contacts
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2].map((i) => (
              <div key={i} className="animate-pulse">
                <div className="h-4 bg-muted rounded w-1/3 mb-2"></div>
                <div className="h-3 bg-muted rounded w-1/2 mb-1"></div>
                <div className="h-3 bg-muted rounded w-1/4"></div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (contacts.length === 0) {
    return (
      <Card className="border border-border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5" />
            Emergency Contacts
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <Shield className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground">No emergency contacts found</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border border-border">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="w-5 h-5" />
          Emergency Contacts ({contacts.length})
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {contacts.map((contact) => (
            <div
              key={contact.id}
              className="p-4 border border-border rounded-lg bg-card"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4 text-muted-foreground" />
                  <h3 className="font-semibold text-foreground">{contact.name}</h3>
                </div>
                
                <div className="flex gap-2">
                  {contact.is_primary && (
                    <Badge variant="default" className="text-xs">
                      Primary
                    </Badge>
                  )}
                  <Badge variant="outline" className="text-xs">
                    {contact.relationship}
                  </Badge>
                </div>
              </div>

              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Phone className="w-4 h-4" />
                  <span>{contact.phone}</span>
                </div>
                
                {contact.email && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Mail className="w-4 h-4" />
                    <span>{contact.email}</span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};