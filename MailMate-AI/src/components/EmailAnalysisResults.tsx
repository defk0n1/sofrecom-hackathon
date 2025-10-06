import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  CheckCircle2, 
  Calendar, 
  Users, 
  Building2, 
  MapPin,
  Clock,
  Target
} from 'lucide-react';
import type { EmailAnalysis } from '@/services/mailmateApi';

interface EmailAnalysisResultsProps {
  analysis: EmailAnalysis;
  emailContent?: string;
}

export default function EmailAnalysisResults({ analysis }: EmailAnalysisResultsProps) {
  const getSentimentColor = (sentiment: string) => {
    switch (sentiment.toLowerCase()) {
      case 'positive':
        return 'text-bg-success';
      case 'negative':
        return 'text-bg-danger';
      case 'urgent':
        return 'text-bg-warning';
      default:
        return 'text-bg-secondary';
    }
  };

  const getUrgencyColor = (urgency: string) => {
    switch (urgency.toLowerCase()) {
      case 'critical':
        return 'text-bg-danger';
      case 'high':
        return 'text-bg-warning';
      case 'medium':
        return 'text-bg-info';
      default:
        return 'text-bg-secondary';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority.toLowerCase()) {
      case 'high':
        return 'badge-danger';
      case 'medium':
        return 'badge-warning';
      default:
        return 'badge-secondary';
    }
  };

  return (
    <div className="space-y-4">
      {/* Summary Card */}
      <Card>
        <CardHeader>
          <CardTitle>Email Summary</CardTitle>
          <div className="flex gap-2 mt-2">
            <span className={`badge ${getSentimentColor(analysis.sentiment)}`}>
              {analysis.sentiment}
            </span>
            <span className={`badge ${getUrgencyColor(analysis.urgency)}`}>
              {analysis.urgency} urgency
            </span>
            {analysis.follow_up_required && (
              <span className="badge text-bg-info">Follow-up Required</span>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-gray-700">{analysis.summary}</p>
          
          {analysis.key_points && analysis.key_points.length > 0 && (
            <div className="mt-4">
              <h4 className="font-semibold mb-2 flex items-center gap-2">
                <Target className="w-4 h-4" />
                Key Points
              </h4>
              <ul className="space-y-1">
                {analysis.key_points.map((point, index) => (
                  <li key={index} className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                    <span className="text-sm">{point}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Tasks */}
      {analysis.tasks && analysis.tasks.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5" />
              Tasks Detected ({analysis.tasks.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {analysis.tasks.map((task, index) => (
                <div key={index} className="border rounded-lg p-3">
                  <div className="flex items-start justify-between gap-2">
                    <h4 className="font-medium">{task.task}</h4>
                    <span className={`badge ${getPriorityColor(task.priority)}`}>
                      {task.priority}
                    </span>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-3 text-sm text-gray-600">
                    {task.due_date && (
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {task.due_date}
                      </span>
                    )}
                    {task.estimated_time && (
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {task.estimated_time}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Meeting Suggestions */}
      {analysis.meeting_suggestions && analysis.meeting_suggestions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              Meeting Suggestions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {analysis.meeting_suggestions.map((meeting, index) => (
                <div key={index} className="border rounded-lg p-4">
                  <h4 className="font-semibold text-lg">{meeting.title}</h4>
                  {meeting.purpose && (
                    <p className="text-sm text-gray-600 mt-1">{meeting.purpose}</p>
                  )}
                  <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <span className="text-gray-600">Date:</span>{' '}
                      <span className="font-medium">{meeting.suggested_date}</span>
                    </div>
                    <div>
                      <span className="text-gray-600">Time:</span>{' '}
                      <span className="font-medium">{meeting.suggested_time}</span>
                    </div>
                    <div>
                      <span className="text-gray-600">Duration:</span>{' '}
                      <span className="font-medium">{meeting.duration}</span>
                    </div>
                    {meeting.location && (
                      <div>
                        <span className="text-gray-600">Location:</span>{' '}
                        <span className="font-medium">{meeting.location}</span>
                      </div>
                    )}
                  </div>
                  {meeting.attendees && meeting.attendees.length > 0 && (
                    <div className="mt-2">
                      <span className="text-sm text-gray-600">Attendees: </span>
                      <span className="text-sm">{meeting.attendees.join(', ')}</span>
                    </div>
                  )}
                  {meeting.notes && (
                    <p className="mt-2 text-sm text-gray-600 italic">{meeting.notes}</p>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Entities */}
      {analysis.entities && (
        <Card>
          <CardHeader>
            <CardTitle>Extracted Information</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {analysis.entities.people && analysis.entities.people.length > 0 && (
                <div>
                  <h4 className="font-semibold flex items-center gap-2 mb-2">
                    <Users className="w-4 h-4" />
                    People
                  </h4>
                  <div className="flex flex-wrap gap-1">
                    {analysis.entities.people.map((person, index) => (
                      <Badge key={index} variant="outline">
                        {person}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
              
              {analysis.entities.organizations && analysis.entities.organizations.length > 0 && (
                <div>
                  <h4 className="font-semibold flex items-center gap-2 mb-2">
                    <Building2 className="w-4 h-4" />
                    Organizations
                  </h4>
                  <div className="flex flex-wrap gap-1">
                    {analysis.entities.organizations.map((org, index) => (
                      <Badge key={index} variant="outline">
                        {org}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
              
              {analysis.entities.dates && analysis.entities.dates.length > 0 && (
                <div>
                  <h4 className="font-semibold flex items-center gap-2 mb-2">
                    <Calendar className="w-4 h-4" />
                    Dates
                  </h4>
                  <div className="flex flex-wrap gap-1">
                    {analysis.entities.dates.map((date, index) => (
                      <Badge key={index} variant="outline">
                        {date}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
              
              {analysis.entities.locations && analysis.entities.locations.length > 0 && (
                <div>
                  <h4 className="font-semibold flex items-center gap-2 mb-2">
                    <MapPin className="w-4 h-4" />
                    Locations
                  </h4>
                  <div className="flex flex-wrap gap-1">
                    {analysis.entities.locations.map((location, index) => (
                      <Badge key={index} variant="outline">
                        {location}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Language & Attachments */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-gray-600">Language:</span>{' '}
              <span className="font-medium">{analysis.language_detected}</span>
            </div>
            {analysis.attachments_mentioned && analysis.attachments_mentioned.length > 0 && (
              <div>
                <span className="text-gray-600">Attachments Mentioned:</span>{' '}
                <span className="font-medium">{analysis.attachments_mentioned.length}</span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
