"use client";

import React, { useState, useEffect } from 'react';

const HolidayManager = () => {
  const [holidays, setHolidays] = useState([]);
  const [country, setCountry] = useState('IN');
  const [year, setYear] = useState('2026');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Initial load or when country/year changes
  useEffect(() => {
    fetchHolidays();
  }, [country, year]);

  const fetchHolidays = async () => {
    setLoading(true);
    setError('');
    
    try {
      const response = await fetch(`https://date.nager.at/api/v3/PublicHolidays/${year}/${country}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch holidays');
      }
      
      const data = await response.json();
      
      if (!data || data.length === 0) {
        setError('No holidays found for this region/year.');
        setHolidays([]);
        return;
      }
      
      const mappedHolidays = data.map((h, index) => ({
        id: h.date + '-' + index,
        date: new Date(h.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }),
        name: h.name,
        description: h.localName || (h.types ? h.types[0] : 'Public Holiday'),
        rawDate: h.date
      }));
      
      // Sort chronologically
      mappedHolidays.sort((a, b) => new Date(a.rawDate) - new Date(b.rawDate));
      
      setHolidays(mappedHolidays);
    } catch (err) {
      console.error(err);
      setError('Network error fetching holidays. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const deleteHoliday = (id) => {
    setHolidays(holidays.filter(h => h.id !== id));
  };
  
  const handleAddHoliday = () => {
    alert('Manual add holiday functionality would go here');
  };

  return (
    <div className="max-w-4xl mx-auto bg-white p-6 rounded-xl shadow-sm border border-slate-200">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
        <h2 className="text-lg font-bold text-slate-800">Annual Holidays</h2>
        
        <div className="flex flex-wrap items-center gap-3">
          <select 
            value={country} 
            onChange={(e) => setCountry(e.target.value)}
            className="px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-sm text-slate-700 outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="IN">IN (India)</option>
            <option value="US">US (USA)</option>
            <option value="GB">GB (UK)</option>
            <option value="AU">AU (Australia)</option>
            <option value="CA">CA (Canada)</option>
          </select>
          
          <select 
            value={year} 
            onChange={(e) => setYear(e.target.value)}
            className="px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-sm text-slate-700 outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="2025">2025</option>
            <option value="2026">2026</option>
            <option value="2027">2027</option>
          </select>
          
          <button 
            onClick={fetchHolidays} 
            disabled={loading}
            className="px-4 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-medium rounded-lg transition-colors flex items-center gap-2 border border-slate-300 disabled:opacity-50"
          >
            {loading ? (
              <span className="animate-spin h-4 w-4 border-2 border-slate-500 border-t-transparent rounded-full"></span>
            ) : (
              <span>⬇️</span>
            )}
            Import
          </button>
          
          <button 
            onClick={handleAddHoliday}
            className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors flex items-center gap-2"
          >
            <span>➕</span> Add Holiday
          </button>
        </div>
      </div>
      
      {error && (
        <div className="mb-4 p-3 bg-red-50 text-red-700 text-sm rounded-lg border border-red-200">
          {error}
        </div>
      )}

      <div className="border border-slate-200 rounded-lg overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase tracking-wider text-slate-500 font-semibold border-b border-slate-200">
            <tr>
              <th className="py-3 px-4 w-32">Date</th>
              <th className="py-3 px-4">Name</th>
              <th className="py-3 px-4">Description</th>
              <th className="py-3 px-4 text-right w-24">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {holidays.length > 0 ? (
              holidays.map((h) => (
                <tr key={h.id} className="hover:bg-slate-50 transition-colors group">
                  <td className="py-3 px-4 font-medium text-blue-600 whitespace-nowrap">{h.date}</td>
                  <td className="py-3 px-4 font-medium text-slate-800">{h.name}</td>
                  <td className="py-3 px-4 text-slate-500">{h.description}</td>
                  <td className="py-3 px-4 text-right">
                    <button 
                      onClick={() => alert('Edit holiday ' + h.name)}
                      className="text-slate-400 hover:text-blue-600 mx-1 transition-colors"
                      title="Edit"
                    >
                      ✏️
                    </button>
                    <button 
                      onClick={() => deleteHoliday(h.id)}
                      className="text-slate-400 hover:text-red-500 mx-1 transition-colors"
                      title="Delete"
                    >
                      🗑️
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="4" className="py-12 text-center text-slate-500">
                  {loading ? 'Fetching holidays...' : 'No holidays configured yet.'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default HolidayManager;
