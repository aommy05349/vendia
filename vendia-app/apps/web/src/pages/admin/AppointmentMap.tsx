import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { format, addDays, subDays, parseISO } from 'date-fns';
import { th, enUS } from 'date-fns/locale';
import { useTranslation } from 'react-i18next';
import { api } from '@vendia/shared';

// Fix Leaflet icon issue
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

let DefaultIcon = L.icon({
    iconUrl: icon,
    shadowUrl: iconShadow,
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
});

L.Marker.prototype.options.icon = DefaultIcon;

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
  location_name: string | null;
  address: string;
  latitude?: string | number | null;
  longitude?: string | number | null;
}

interface AppointmentMapProps {
  currentDate: Date;
  onDateChange: (date: Date) => void;
  appointments?: Appointment[];
  showControls?: boolean;
}

// Component to update map center when appointments change
const MapUpdater = ({ center }: { center: [number, number] }) => {
  const map = useMap();
  useEffect(() => {
    map.setView(center, map.getZoom());
  }, [center, map]);
  return null;
};

export const AppointmentMap: React.FC<AppointmentMapProps> = ({ 
    currentDate, 
    onDateChange, 
    appointments: propAppointments,
    showControls = true 
}) => {
  const { t, i18n } = useTranslation();
  const locale = i18n.language === 'th' ? th : enUS;
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(false);
  // Default center (Thailand)
  const [center, setCenter] = useState<[number, number]>([13.7563, 100.5018]); 

  useEffect(() => {
    if (propAppointments) {
        setAppointments(propAppointments);
        // Center on first location if available
        const firstLoc = propAppointments.find(a => a.latitude && a.longitude);
        if (firstLoc && firstLoc.latitude && firstLoc.longitude) {
            setCenter([Number(firstLoc.latitude), Number(firstLoc.longitude)]);
        }
    } else {
        fetchAppointments();
    }
  }, [currentDate, propAppointments]);

  const fetchAppointments = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      const dateStr = format(currentDate, 'yyyy-MM-dd');
      params.append('start_date', dateStr);
      params.append('end_date', dateStr);
      
      const response = await api.get(`/appointments?${params.toString()}`);
      const data: Appointment[] = response.data;
      setAppointments(data);

      // If there are appointments with location, center the map on the first one
      const firstLoc = data.find(a => a.latitude && a.longitude);
      if (firstLoc && firstLoc.latitude && firstLoc.longitude) {
        setCenter([Number(firstLoc.latitude), Number(firstLoc.longitude)]);
      }
    } catch (error) {
      console.error('Failed to fetch appointments', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePrevDay = () => {
    onDateChange(subDays(currentDate, 1));
  };

  const handleNextDay = () => {
    onDateChange(addDays(currentDate, 1));
  };

  return (
    <div className="card h-100 border-0">
      {showControls && (
      <div className="card-header bg-white d-flex justify-content-between align-items-center py-3">
        <button className="btn btn-outline-secondary" onClick={handlePrevDay}>
          <i className="bi bi-chevron-left"></i>
        </button>
        
        <div className="d-flex align-items-center gap-2">
            <h5 className="mb-0 fw-bold">
              {format(currentDate, 'EEEE, d MMMM yyyy', { locale })}
            </h5>
            <input 
                type="date" 
                className="form-control form-control-sm" 
                style={{ width: 'auto' }}
                value={format(currentDate, 'yyyy-MM-dd')}
                onChange={(e) => onDateChange(parseISO(e.target.value))}
            />
        </div>

        <button className="btn btn-outline-secondary" onClick={handleNextDay}>
          <i className="bi bi-chevron-right"></i>
        </button>
      </div>
      )}
      
      <div className="card-body p-0" style={{ height: showControls ? '600px' : '500px', minHeight: '400px', position: 'relative' }}>
        {loading && (
            <div className="position-absolute w-100 h-100 d-flex justify-content-center align-items-center bg-white bg-opacity-75" style={{ zIndex: 1000 }}>
                <div className="spinner-border text-primary" role="status"></div>
            </div>
        )}
        
        <MapContainer center={center} zoom={10} style={{ height: '100%', width: '100%' }}>
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <MapUpdater center={center} />
          
          {appointments.map((apt) => (
            apt.latitude && apt.longitude ? (
              <Marker key={apt.id} position={[Number(apt.latitude), Number(apt.longitude)]}>
                <Popup>
                  <div className="p-2">
                    <h6 className="fw-bold mb-1">{apt.title}</h6>
                    <div className="text-muted small mb-2">
                        <i className="bi bi-clock me-1"></i>
                        {format(new Date(apt.start_time), 'HH:mm')} - {apt.end_time ? format(new Date(apt.end_time), 'HH:mm') : ''}
                    </div>
                    <div className="mb-1">
                        <strong>{t('appointments.table.customer')}:</strong> {apt.customer.first_name} {apt.customer.last_name}
                    </div>
                    <div className="small text-muted">
                        <i className="bi bi-geo-alt me-1"></i>
                        {apt.location_name || apt.address}
                    </div>
                    <div className="mt-2">
                        <span className={`badge bg-${apt.status === 'completed' ? 'success' : apt.status === 'cancelled' ? 'danger' : 'primary'}`}>
                            {apt.status}
                        </span>
                    </div>
                  </div>
                </Popup>
              </Marker>
            ) : null
          ))}
        </MapContainer>
      </div>
    </div>
  );
};
