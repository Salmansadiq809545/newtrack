import React, { useState, useEffect } from 'react';
import { Download, Plus, AlertTriangle, CheckCircle } from 'lucide-react';
import axios from 'axios';
const API_URL = 'http://localhost:5000'; 
const AnnotationTracker = () => {
  const [entries, setEntries] = useState([]);
  const [formData, setFormData] = useState({
    userName: '',
    qaName: '',
    annotationCount: '',
    anticipatedCount: '',
    timeSlot: '',
    location: '',
    date: new Date().toISOString().split('T')[0]
  });
 const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };
  const locations = [
  { value: 'vyom', label: 'Vyom' },
  { value: 'rcity', label: 'RCity' },
  { value: 'rsm', label: 'RSM' }
];
  const timeSlots = ['9-10', '10-11', '11-12', '12-1', '1-2', '2-3', '3-4', '4-5', '5-6'];
  // Load data from localStorage on component mount
  // Replace useEffect for loading entries
useEffect(() => {
  axios.get(`${API_URL}/entries`)
    .then(res => setEntries(res.data))
    .catch(err => console.error(err));
}, []);

// ✅ Submit entry to MongoDB
const handleSubmit = async () => {
  if (!formData.userName || !formData.qaName || !formData.annotationCount || !formData.timeSlot || !formData.location || !formData.date || !formData.anticipatedCount) {
    alert('Please fill all fields');
    return;
  }

  const newEntry = {
    ...formData,
    annotationCount: parseInt(formData.annotationCount),
    anticipatedCount: parseInt(formData.anticipatedCount),
    timestamp: new Date().toISOString()
  };

  try {
    const res = await axios.post(`${API_URL}/entries`, newEntry);
    setEntries(prev => [...prev, res.data.entry]);
    setFormData({
      userName: '',
      qaName: '',
      annotationCount: '',
      anticipatedCount: '',
      timeSlot: '',
      location: '',
      date: new Date().toISOString().split('T')[0]
    });
  } catch (err) {
    console.error('Failed to save entry', err);
  }
};

// 🧹 Clear all data
const clearAllData = async () => {
  if (window.confirm('Are you sure you want to clear all data?')) {
    try {
      await axios.delete(`${API_URL}/entries`);
      setEntries([]);
    } catch (err) {
      console.error('Failed to clear data', err);
    }
  }
};

  const getUserStats = () => {
    const userStats = {};
    entries.forEach(entry => {
      const key = `${entry.userName}-${entry.date}-${entry.location}`;
      if (!userStats[key]) {
        userStats[key] = {
          userName: entry.userName,
          qaName: entry.qaName,
          location: entry.location,
          date: entry.date,
          totalAnnotations: 0,
          timeSlots: {},
          lowHourlyCount: 0,
          hasLowTotal: false
        };
      }
      userStats[key].totalAnnotations += entry.annotationCount;
      userStats[key].timeSlots[entry.timeSlot] = entry.annotationCount;
      
      if (entry.annotationCount < 30) {
        userStats[key].lowHourlyCount++;
      }
    });

    Object.values(userStats).forEach(user => {
      user.hasLowTotal = user.totalAnnotations < 500;
    });

    return Object.values(userStats);
  };

const downloadExcel = () => {
  const userStats = getUserStats();

  let htmlTable = `﻿<table border="1" style="border-collapse: collapse; font-family: Arial, sans-serif;">
    <thead>
      <tr style="background-color: #f3f4f6; font-weight: bold;">
        <th style="padding: 8px; text-align: center;">S. No.</th>
        <th style="padding: 8px; text-align: center;">User Name</th>
        <th style="padding: 8px; text-align: center;">Location</th>
        <th style="padding: 8px; text-align: center;">Date</th>
        <th style="padding: 8px; text-align: center;">QA Name</th>
        ${timeSlots.map(slot => `<th style="padding: 8px; text-align: center;">${slot}</th>`).join('')}
        <th style="padding: 8px; text-align: center;">Total Annotations</th>
        <th style="padding: 8px; text-align: center;">Anticipated Count</th>
        <th style="padding: 8px; text-align: center;">Met 30/hr (%)</th>
        <th style="padding: 8px; text-align: center;">Met 500/day</th>
      </tr>
    </thead>
    <tbody>`;

  userStats.forEach((user, index) => {
    const hourlyCounts = timeSlots.map(slot => {
      const count = user.timeSlots[slot];
      if (count == null) return '<td style="padding: 6px; text-align: center;">-</td>';
      const bgColor = count < 30 ? '#f87171' : '#4ade80'; // red/green
      return `<td style="background-color:${bgColor}; color:#fff; padding: 6px; text-align: center;">${count}</td>`;
    });

    const metSlots = Object.values(user.timeSlots).filter(c => c >= 30).length;
    const totalSlots = Object.values(user.timeSlots).length;
    const percentMet = totalSlots ? ((metSlots / totalSlots) * 100).toFixed(2) + '%' : '0%';

    const anticipated = entries
      .filter(e => e.userName === user.userName && e.date === user.date && e.location === user.location)
      .reduce((sum, e) => sum + (e.anticipatedCount || 0), 0);

    const anticipatedColor = anticipated < 30 ? '#f87171' : '#4ade80';
    const totalColor = user.totalAnnotations >= 500 ? '#4ade80' : '#f87171';

    htmlTable += `<tr>
      <td style="padding: 6px; text-align: center;">${index + 1}</td>
      <td style="padding: 6px; text-align: center;">${user.userName}</td>
      <td style="padding: 6px; text-align: center;">${user.location}</td>
      <td style="padding: 6px; text-align: center;">${user.date}</td>
      <td style="padding: 6px; text-align: center;">${user.qaName}</td>
      ${hourlyCounts.join('')}
      <td style="background-color:${totalColor}; color:#fff; padding: 6px; text-align: center;">${user.totalAnnotations}</td>
      <td style="background-color:${anticipatedColor}; color:#fff; padding: 6px; text-align: center;">${anticipated}</td>
      <td style="padding: 6px; text-align: center;">${percentMet}</td>
      <td style="padding: 6px; text-align: center;">${user.hasLowTotal ? 'NO' : 'YES'}</td>
    </tr>`;
  });

  htmlTable += `</tbody></table>`;

  const blob = new Blob([htmlTable], { type: 'application/vnd.ms-excel' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `annotation_report_${new Date().toISOString().split('T')[0]}.xls`;
  link.click();
  URL.revokeObjectURL(url);
};







  

  const userStats = getUserStats();

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-7xl mx-auto">
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <h1 className="text-3xl font-bold text-gray-800 mb-6">Annotation Tracker Dashboard</h1>
          
          {/* Form */}
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4 mb-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">User Name</label>
              <input
                type="text"
                name="userName"
                value={formData.userName}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter user name"
              />
            </div>
            
          <div>
  <label className="block text-sm font-medium text-gray-700 mb-2">QA Name</label>
  <select
    name="qaName"
    value={formData.qaName}
    onChange={handleInputChange}
    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
  >
    <option value="">Select QA</option>
    {['QA1', 'QA2', 'QA3', 'QA4', 'QA5', 'QA6', 'QA7', 'QA8'].map(qa => (
      <option key={qa} value={qa}>{qa}</option>
    ))}
  </select>
</div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Annotation Count</label>
              <input
                type="number"
                name="annotationCount"
                value={formData.annotationCount}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter count"
                min="0"
              />
            </div>
            <div>
  <label className="block text-sm font-medium text-gray-700 mb-2">Anticipated Count</label>
  <input
    type="number"
    name="anticipatedCount"
    value={formData.anticipatedCount}
    onChange={handleInputChange}
    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
    placeholder="Enter anticipated count"
    min="0"
  />
</div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Time Slot</label>
              <select
                name="timeSlot"
                value={formData.timeSlot}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select time slot</option>
                {timeSlots.map(slot => (
                  <option key={slot} value={slot}>{slot}</option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Location</label>
              <select
                name="location"
                value={formData.location}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select location</option>
                {locations.map(loc => (
                  <option key={loc.value} value={loc.value}>{loc.label}</option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Date</label>
              <input
                type="date"
                name="date"
                value={formData.date}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            
            <div className="flex items-end">
              <button
                type="button"
                onClick={handleSubmit}
                className="w-full bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
              >
                <Plus size={20} />
                Add Entry
              </button>
            </div>
            
            <div className="flex items-end">
              <button
                type="button"
                onClick={clearAllData}
                className="w-full bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 transition-colors flex items-center justify-center gap-2"
              >
                Clear Data
              </button>
            </div>
            
            <div className="flex items-end">
              <button
                type="button"
                onClick={downloadExcel}
                disabled={entries.length === 0}
                className="w-full bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 transition-colors flex items-center justify-center gap-2 disabled:bg-gray-400"
              >
                <Download size={20} />
                Download Excel
              </button>
            </div>
          </div>
        </div>

        {/* Stats Summary */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <h2 className="text-xl font-bold text-gray-800 mb-4">Summary Statistics</h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-blue-50 p-4 rounded-lg">
              <div className="text-2xl font-bold text-blue-600">{entries.length}</div>
              <div className="text-sm text-gray-600">Total Entries</div>
            </div>
            <div className="bg-green-50 p-4 rounded-lg">
              <div className="text-2xl font-bold text-green-600">{userStats.length}</div>
              <div className="text-sm text-gray-600">Active Users</div>
            </div>
            <div className="bg-red-50 p-4 rounded-lg">
              <div className="text-2xl font-bold text-red-600">
                {userStats.filter(u => u.hasLowTotal).length}
              </div>
              <div className="text-sm text-gray-600">Users Below 500</div>
            </div>
            <div className="bg-orange-50 p-4 rounded-lg">
              <div className="text-2xl font-bold text-orange-600">
                {entries.filter(e => e.annotationCount < 30).length}
              </div>
              <div className="text-sm text-gray-600">Low Hourly Entries</div>
            </div>
          </div>
        </div>

        {/* User Performance Table */}
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-xl font-bold text-gray-800 mb-4">User Performance Overview</h2>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse border border-gray-300">
              <thead>
                <tr className="bg-gray-50">
                  <th className="border border-gray-300 px-4 py-2 text-left">User</th>
                  <th className="border border-gray-300 px-4 py-2 text-left">QA</th>
                  <th className="border border-gray-300 px-4 py-2 text-left">Location</th>
                  <th className="border border-gray-300 px-4 py-2 text-left">Date</th>
                  <th className="border border-gray-300 px-4 py-2 text-center">Total</th>
                  <th className="border border-gray-300 px-4 py-2 text-center">Status</th>
                  {timeSlots.map(slot => (
                    <th key={slot} className="border border-gray-300 px-2 py-2 text-center text-sm">{slot}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {userStats.map((user, index) => (
                  <tr key={index} className={user.hasLowTotal ? 'bg-red-50' : 'bg-white'}>
                    <td className="border border-gray-300 px-4 py-2 font-medium">{user.userName}</td>
                    <td className="border border-gray-300 px-4 py-2">{user.qaName}</td>
                    <td className="border border-gray-300 px-4 py-2">{user.location}</td>
                    <td className="border border-gray-300 px-4 py-2">{user.date}</td>
                    <td className={`border border-gray-300 px-4 py-2 text-center font-bold ${user.hasLowTotal ? 'text-red-600' : 'text-green-600'}`}>
                      {user.totalAnnotations}
                    </td>
                    <td className="border border-gray-300 px-4 py-2 text-center">
                      {user.hasLowTotal ? (
                        <AlertTriangle className="text-red-500 mx-auto" size={20} />
                      ) : (
                        <CheckCircle className="text-green-500 mx-auto" size={20} />
                      )}
                    </td>
                    {timeSlots.map(slot => (
                      <td key={slot} className={`border border-gray-300 px-2 py-2 text-center ${user.timeSlots[slot] && user.timeSlots[slot] < 30 ? 'bg-red-100 text-red-700 font-bold' : ''}`}>
                        {user.timeSlots[slot] || '-'}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Recent Entries */}
        <div className="bg-white rounded-lg shadow-lg p-6 mt-6">
          <h2 className="text-xl font-bold text-gray-800 mb-4">Recent Entries</h2>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse border border-gray-300">
              <thead>
                <tr className="bg-gray-50">
                  <th className="border border-gray-300 px-4 py-2 text-left">User</th>
                  <th className="border border-gray-300 px-4 py-2 text-left">QA</th>
                  <th className="border border-gray-300 px-4 py-2 text-left">Location</th>
                  <th className="border border-gray-300 px-4 py-2 text-left">Date</th>
                  <th className="border border-gray-300 px-4 py-2 text-center">Time</th>
                  <th className="border border-gray-300 px-4 py-2 text-center">Count</th>
                </tr>
              </thead>
              <tbody>
                {entries.slice(-10).reverse().map((entry) => (
                  <tr key={entry.id} className={entry.annotationCount < 30 ? 'bg-red-50' : 'bg-white'}>
                    <td className="border border-gray-300 px-4 py-2">{entry.userName}</td>
                    <td className="border border-gray-300 px-4 py-2">{entry.qaName}</td>
                    <td className="border border-gray-300 px-4 py-2">{entry.location}</td>
                    <td className="border border-gray-300 px-4 py-2">{entry.date}</td>
                    <td className="border border-gray-300 px-4 py-2 text-center">{entry.timeSlot}</td>
                    <td className={`border border-gray-300 px-4 py-2 text-center font-bold ${entry.annotationCount < 30 ? 'text-red-600' : 'text-green-600'}`}>
                      {entry.annotationCount}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AnnotationTracker;
