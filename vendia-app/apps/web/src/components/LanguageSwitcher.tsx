import React, { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';

export const LanguageSwitcher = () => {
  const { i18n } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const changeLanguage = (lng: string) => {
    i18n.changeLanguage(lng);
    setIsOpen(false);
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  return (
    <div className="dropdown" ref={dropdownRef}>
      <button
        className={`btn btn-outline-secondary dropdown-toggle ${isOpen ? 'show' : ''}`}
        type="button"
        id="languageDropdown"
        aria-expanded={isOpen}
        onClick={() => setIsOpen(!isOpen)}
      >
        <i className="bi bi-globe me-1"></i>
        {i18n.language === 'th' ? 'ไทย' : 'English'}
      </button>
      <ul 
        className={`dropdown-menu dropdown-menu-end ${isOpen ? 'show' : ''}`} 
        aria-labelledby="languageDropdown"
        style={{ position: 'absolute', inset: 'auto 0px auto auto', margin: '0px', transform: 'translate(0px, 40px)' }} // Force positioning if needed
      >
        <li>
          <button
            className={`dropdown-item ${i18n.language === 'en' ? 'active' : ''}`}
            onClick={() => changeLanguage('en')}
          >
            English
          </button>
        </li>
        <li>
          <button
            className={`dropdown-item ${i18n.language === 'th' ? 'active' : ''}`}
            onClick={() => changeLanguage('th')}
          >
            ไทย (Thai)
          </button>
        </li>
      </ul>
    </div>
  );
};
