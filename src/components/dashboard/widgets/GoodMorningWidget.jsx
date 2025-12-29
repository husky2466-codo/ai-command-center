import React from 'react';
import { Sun, Moon, Clock } from 'lucide-react';
import Card from '../../shared/Card';

/**
 * GoodMorningWidget - Personalized greeting with date/time
 */
function GoodMorningWidget({ greeting }) {
  if (!greeting) return null;

  const hour = new Date().getHours();
  const Icon = hour < 12 ? Sun : hour < 18 ? Sun : Moon;

  return (
    <Card className="good-morning-widget" variant="elevated" padding="lg">
      <div className="greeting-header">
        <Icon className="greeting-icon" size={32} />
        <div className="greeting-content">
          <h1 className="greeting-message">{greeting.message}</h1>
          <div className="greeting-meta">
            <Clock size={14} />
            <span className="greeting-date">{greeting.date}</span>
            <span className="greeting-time">{greeting.time}</span>
          </div>
        </div>
      </div>
    </Card>
  );
}

export default GoodMorningWidget;
