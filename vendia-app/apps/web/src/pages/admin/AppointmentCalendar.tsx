import React from 'react';
import { 
  format, 
  startOfWeek, 
  endOfWeek, 
  startOfMonth, 
  endOfMonth, 
  isSameMonth, 
  isSameDay, 
  addMonths, 
  subMonths,
  parseISO,
  isToday
} from 'date-fns';
import { th, enUS } from 'date-fns/locale';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';

interface Appointment {
  id: number;
  title: string;
  start_time: string;
  end_time: string | null;
  status: string;
  customer: {
    id: number;
    name: string;
    first_name?: string;
    last_name?: string;
    company_name?: string;
  };
  technicians: {
    id: number;
    first_name?: string;
    last_name?: string;
    pivot: {
      is_lead: boolean;
    };
  }[];
  location_name: string | null;
  address: string;
}

interface AppointmentCalendarProps {
  appointments: Appointment[];
  currentDate: Date;
  onDateChange: (date: Date) => void;
  loading: boolean;
}

export const AppointmentCalendar: React.FC<AppointmentCalendarProps> = ({ 
  appointments, 
  currentDate, 
  onDateChange,
  loading 
}) => {
  const { t, i18n } = useTranslation();
  const locale = i18n.language === 'th' ? th : enUS;

  const nextMonth = () => {
    onDateChange(addMonths(currentDate, 1));
  };

  const prevMonth = () => {
    onDateChange(subMonths(currentDate, 1));
  };

  const today = () => {
    onDateChange(new Date());
  };

  const renderHeader = () => {
    return (
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div className="d-flex align-items-center gap-2">
          <button className="btn btn-outline-secondary btn-sm" onClick={prevMonth}>
            <i className="bi bi-chevron-left"></i>
          </button>
          <button className="btn btn-outline-secondary btn-sm" onClick={nextMonth}>
            <i className="bi bi-chevron-right"></i>
          </button>
          <button className="btn btn-outline-primary btn-sm ms-2" onClick={today}>
            {t('common.today', 'Today')}
          </button>
          <h4 className="mb-0 ms-3 text-capitalize">
            {format(currentDate, 'MMMM yyyy', { locale })}
          </h4>
        </div>
      </div>
    );
  };

  const renderDays = () => {
    const dateFormat = 'E';
    const days = [];
    const startDate = startOfWeek(currentDate, { locale });

    for (let i = 0; i < 7; i++) {
      days.push(
        <div className="col text-center fw-bold text-muted py-2 bg-light border" key={i}>
          {format(new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate() + i), dateFormat, { locale })}
        </div>
      );
    }

    return <div className="row g-0">{days}</div>;
  };

  const renderCells = () => {
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(monthStart);
    const startDate = startOfWeek(monthStart, { locale });
    const endDate = endOfWeek(monthEnd, { locale });

    const dateFormat = 'd';
    const rows = [];
    let days = [];
    let day = startDate;
    let formattedDate = '';

    while (day <= endDate) {
      for (let i = 0; i < 7; i++) {
        formattedDate = format(day, dateFormat);
        const cloneDay = day;
        
        // Filter appointments for this day
        const daysAppointments = appointments.filter(apt => 
          isSameDay(parseISO(apt.start_time), cloneDay)
        );

        // Sort by time
        daysAppointments.sort((a, b) => 
          new Date(a.start_time).getTime() - new Date(b.start_time).getTime()
        );

        days.push(
          <div
            className={`col border min-h-150 p-1 position-relative ${
              !isSameMonth(day, monthStart)
                ? 'bg-light text-muted opacity-50'
                : 'bg-white'
            } ${isToday(day) ? 'bg-primary-subtle' : ''}`}
            key={day.toString()}
            style={{ 
                minHeight: '150px', 
                height: '100%',
                width: '14.28%', 
                flex: '0 0 14.28%', 
                maxWidth: '14.28%' 
            }}
          >
            <div className={`d-flex justify-content-between align-items-center px-2 py-1 ${isToday(day) ? 'text-primary fw-bold' : ''}`}>
              <span>{formattedDate}</span>
              {daysAppointments.length > 0 && (
                <span className="badge bg-secondary rounded-pill" style={{ fontSize: '0.7em' }}>
                  {daysAppointments.length}
                </span>
              )}
            </div>
            
            <div className="d-flex flex-column gap-1 overflow-auto" style={{ maxHeight: '120px' }}>
              {daysAppointments.map((apt) => {
                 // Find lead
                 const lead = apt.technicians.find(tech => tech.pivot.is_lead);
                 const leadName = lead 
                    ? (lead.first_name || `Tech #${lead.id}`) 
                    : (apt.technicians.length > 0 ? (apt.technicians[0].first_name || 'Tech') : 'No Tech');

                 return (
                  <Link 
                    to={`/appointments/${apt.id}`}
                    key={apt.id} 
                    className={`text-decoration-none p-1 rounded border-start border-3 small d-block text-truncate ${
                        apt.status === 'completed' ? 'bg-success-subtle border-success text-dark' :
                        apt.status === 'cancelled' ? 'bg-danger-subtle border-danger text-dark' :
                        apt.status === 'in_progress' ? 'bg-warning-subtle border-warning text-dark' :
                        'bg-primary-subtle border-primary text-dark'
                    }`}
                    style={{ fontSize: '0.75rem' }}
                    title={`${format(parseISO(apt.start_time), 'HH:mm')} - ${apt.title}\nLead: ${leadName}\nStatus: ${apt.status}`}
                  >
                    <div className="d-flex align-items-center gap-1">
                        <span className="fw-bold">{format(parseISO(apt.start_time), 'HH:mm')}</span>
                        <span className="text-truncate flex-grow-1">{apt.title || 'Untitled'}</span>
                    </div>
                    <div className="text-truncate opacity-75" style={{ fontSize: '0.7em' }}>
                        <i className="bi bi-person-fill me-1"></i>
                        {leadName}
                    </div>
                  </Link>
                 );
              })}
            </div>
          </div>
        );
        day = new Date(day.getFullYear(), day.getMonth(), day.getDate() + 1); // safe add day
      }
      rows.push(
        <div className="row g-0" key={day.toString()}>
          {days}
        </div>
      );
      days = [];
    }
    return <div className="mb-5">{rows}</div>;
  };

  if (loading) {
      return (
        <div className="text-center py-5">
            <div className="spinner-border text-primary" role="status"></div>
        </div>
      );
  }

  return (
    <div className="calendar-container">
      {renderHeader()}
      {renderDays()}
      {renderCells()}
    </div>
  );
};
