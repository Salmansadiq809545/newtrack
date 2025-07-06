import React, { useState, useEffect } from 'react';
import { Download, Plus, AlertTriangle, CheckCircle } from 'lucide-react';

const AnnotationTracker = () => {
  const [entries, setEntries] = useState([]);
  const [selectedLocation, setSelectedLocation] = useState('vyom');
  const [formData, setFormData] = useState({
    userName: '',
    qaName: '',
    annotationCount: '',
    timeSlot: '9-10'
  });

  const locations = [
    { value: 'vyom', label: 'Vyom' },
    { value: 'rcity', label: 'R City' },
    { value: 'rsm', label: 'RSM' }
  ];

  const timeSlots = [
    '9-10', '10-11', '11-12', '12-1', '1-2', '2-3', '3-4', '4-5', '5-6'
  ];

  // Load data from memory storage on component mount
  useEffect(() => {
    const savedEntries = JSON.parse(localStorage.getItem('annotationEntries') || '[]');
    setEntries(savedEntries);
  }, []);

  // Save data to memory storage whenever entries change
  useEffect(() => {
    localStorage.setItem('annotationEntries', JSON.stringify(entries));
  }, [entries]);

  const generateUniqueId = () => {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSubmit = () => {
    if (!formData.userName || !formData.qaName || !formData.annotationCount) {
      alert('Please fill all fields');
      return;
    }

    const newEntry = {
      id: generateUniqueId(),
      location: selectedLocation,
      userName: formData.userName,
      qaName: formData.qaName,
      annotationCount: parseInt(formData.annotationCount),
      timeSlot: formData.timeSlot,
      timestamp: new Date().toISOString()
    };

    setEntries(prev => [...prev, newEntry]);
    setFormData({
      userName: '',
      qaName: '',
      annotationCount: '',
      timeSlot: '9-10'
    });
  };

  const getCurrentLocationEntries = () => {
    return entries.filter(entry => entry.location === selectedLocation);
  };

  const getUserSummary = () => {
    const locationEntries = getCurrentLocationEntries();
    const userSummary = {};

    locationEntries.forEach(entry => {
      const key = `${entry.userName}-${entry.qaName}`;
      if (!userSummary[key]) {
        userSummary[key] = {
          userName: entry.userName,
          qaName: entry.qaName,
          timeSlots: {},
          totalAnnotations: 0,
          entryCount: 0
        };
      }
      userSummary[key].timeSlots[entry.timeSlot] = entry.annotationCount;
      userSummary[key].totalAnnotations += entry.annotationCount;
      userSummary[key].entryCount += 1;
    });

    return Object.values(userSummary);
  };

  const isLowPerformer = (user) => {
    const hasLowHourly = Object.values(user.timeSlots).some(count => count < 30);
    const hasLowTotal = user.totalAnnotations < 500;
    return hasLowHourly || hasLowTotal;
  };

  const exportToExcel = () => {
    const locationEntries = getCurrentLocationEntries();
    const userSummary = getUserSummary();
    
    let csvContent = "data:text/csv;charset=utf-8,";
    csvContent += "Location,User Name,QA Name,";
    timeSlots.forEach(slot => csvContent += `${slot},`);
    csvContent += "Total Annotations,Entry Count,Performance Status\n";
    
    userSummary.forEach(user => {
      const performance = isLowPerformer(user) ? "NEEDS ATTENTION" : "GOOD";
      csvContent += `${selectedLocation},${user.userName},${user.qaName},`;
      timeSlots.forEach(slot => {
        csvContent += `${user.timeSlots[slot] || 0},`;
      });
      csvContent += `${user.totalAnnotations},${user.entryCount},${performance}\n`;
    });
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `annotation_report_${selectedLocation}_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const clearAllData = () => {
    if (window.confirm('Are you sure you want to clear all data? This action cannot be undone.')) {
      setEntries([]);
      localStorage.removeItem('annotationEntries');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-7xl mx-auto">
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <h1 className="text-3xl font-bold text-gray-800 mb-6 text-center">
            Annotation Tracker Dashboard
          </h1>
          
          {/* Location Selector */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select Location
            </label>
            <select
              value={selectedLocation}
              onChange={(e) => setSelectedLocation(e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              {locations.map(location => (
                <option key={location.value} value={location.value}>
                  {location.label}
                </option>
              ))}
            </select>
          </div>

          {/* Entry Form */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4 mb-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                User Name
              </label>
              <input
                type="text"
                value={formData.userName}
                onChange={(e) => handleInputChange('userName', e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Enter user name"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                QA Name
              </label>
              <input
                type="text"
                value={formData.qaName}
                onChange={(e) => handleInputChange('qaName', e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Enter QA name"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Annotation Count
              </label>
              <input
                type="number"
                value={formData.annotationCount}
                onChange={(e) => handleInputChange('annotationCount', e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Enter count"
                min="0"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Time Slot
              </label>
              <select
                value={formData.timeSlot}
                onChange={(e) => handleInputChange('timeSlot', e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                {timeSlots.map(slot => (
                  <option key={slot} value={slot}>{slot}</option>
                ))}
              </select>
            </div>
            
            <div className="flex items-end">
              <button
                type="button"
                onClick={handleSubmit}
                className="w-full bg-blue-600 text-white p-3 rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
              >
                <Plus size={20} />
                Add Entry
              </button>
            </div>
            
            <div className="flex items-end">
              <button
                type="button"
                onClick={exportToExcel}
                className="w-full bg-green-600 text-white p-3 rounded-lg hover:bg-green-700 transition-colors flex items-center justify-center gap-2"
              >
                <Download size={20} />
                Export Excel
              </button>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-4 mb-6">
            <button
              onClick={clearAllData}
              className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors"
            >
              Clear All Data
            </button>
            <div className="text-sm text-gray-600 flex items-center">
              Total Entries for {locations.find(l => l.value === selectedLocation)?.label}: {getCurrentLocationEntries().length}
            </div>
          </div>
        </div>

        {/* Summary Table */}
        <div className="bg-white rounded-lg shadow-lg overflow-hidden">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-800">
              Summary for {locations.find(l => l.value === selectedLocation)?.label}
            </h2>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    User Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    QA Name
                  </th>
                  {timeSlots.map(slot => (
                    <th key={slot} className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {slot}
                    </th>
                  ))}
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Total
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {getUserSummary().map((user, index) => {
                  const isLowPerf = isLowPerformer(user);
                  return (
                    <tr key={index} className={isLowPerf ? 'bg-red-50' : 'bg-white'}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {user.userName}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {user.qaName}
                      </td>
                      {timeSlots.map(slot => (
                        <td key={slot} className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          <span className={user.timeSlots[slot] && user.timeSlots[slot] < 30 ? 'text-red-600 font-bold' : ''}>
                            {user.timeSlots[slot] || 0}
                          </span>
                        </td>
                      ))}
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        <span className={user.totalAnnotations < 500 ? 'text-red-600 font-bold' : 'text-green-600 font-bold'}>
                          {user.totalAnnotations}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        {isLowPerf ? (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                            <AlertTriangle size={12} className="mr-1" />
                            Needs Attention
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            <CheckCircle size={12} className="mr-1" />
                            Good
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          
          {getUserSummary().length === 0 && (
            <div className="text-center py-8 text-gray-500">
              No entries found for {locations.find(l => l.value === selectedLocation)?.label}
            </div>
          )}
        </div>

        {/* Recent Entries */}
        <div className="bg-white rounded-lg shadow-lg mt-6">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-800">
              Recent Entries for {locations.find(l => l.value === selectedLocation)?.label}
            </h2>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    User Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    QA Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Time Slot
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Count
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Timestamp
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {getCurrentLocationEntries().slice(-10).reverse().map((entry) => (
                  <tr key={entry.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {entry.userName}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {entry.qaName}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {entry.timeSlot}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <span className={entry.annotationCount < 30 ? 'text-red-600 font-bold' : ''}>
                        {entry.annotationCount}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(entry.timestamp).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          {getCurrentLocationEntries().length === 0 && (
            <div className="text-center py-8 text-gray-500">
              No recent entries for {locations.find(l => l.value === selectedLocation)?.label}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AnnotationTracker;