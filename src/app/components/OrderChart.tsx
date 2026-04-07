import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const data = [
  { date: '2025-06-25', 'KR Deposit': 180, 'ATAD SRI LANKA': 150, 'WTW Clipped': 120, 'KS withdrwal': 90, 'PI Project': 100, 'WTW Whitelabel': 80 },
  { date: '2025-06-26', 'KR Deposit': 220, 'ATAD SRI LANKA': 140, 'WTW Clipped': 130, 'KS withdrwal': 85, 'PI Project': 110, 'WTW Whitelabel': 90 },
  { date: '2025-06-27', 'KR Deposit': 160, 'ATAD SRI LANKA': 155, 'WTW Clipped': 145, 'KS withdrwal': 95, 'PI Project': 130, 'WTW Whitelabel': 110 },
  { date: '2025-06-28', 'KR Deposit': 140, 'ATAD SRI LANKA': 280, 'WTW Clipped': 160, 'KS withdrwal': 110, 'PI Project': 145, 'WTW Whitelabel': 130 },
  { date: '2025-06-29', 'KR Deposit': 150, 'ATAD SRI LANKA': 350, 'WTW Clipped': 170, 'KS withdrwal': 120, 'PI Project': 160, 'WTW Whitelabel': 145 },
  { date: '2025-06-30', 'KR Deposit': 165, 'ATAD SRI LANKA': 180, 'WTW Clipped': 160, 'KS withdrwal': 130, 'PI Project': 150, 'WTW Whitelabel': 160 },
  { date: '2025-08-31', 'KR Deposit': 170, 'ATAD SRI LANKA': 90, 'WTW Clipped': 140, 'KS withdrwal': 145, 'PI Project': 135, 'WTW Whitelabel': 185 },
  { date: '2025-09-01', 'KR Deposit': 180, 'ATAD SRI LANKA': 70, 'WTW Clipped': 130, 'KS withdrwal': 160, 'PI Project': 120, 'WTW Whitelabel': 200 },
];

const legendItems = [
  { name: 'KR Deposit', color: '#ef4444' },
  { name: 'ATAD SRI LANKA', color: '#eab308' },
  { name: 'WTW Clipped', color: '#22c55e' },
  { name: 'KS withdrwal', color: '#3b82f6' },
  { name: 'PI Project', color: '#a855f7' },
  { name: 'WTW Whitelabel', color: '#ec4899' },
];

export function OrderChart() {
  return (
    <div className="">
      {/*<div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-semibold text-white bg-blue-600 px-4 py-2 rounded-md">
          All Project Order Count
        </h2>
        <select className="border border-gray-300 rounded px-3 py-1 text-sm">
          <option>All</option>
        </select>
      </div>*/}

      {/* Custom Legend */}
      {/*<div className="flex items-center gap-6 mb-4 text-xs flex-wrap">
        {legendItems.map((item) => (
          <div key={item.name} className="flex items-center gap-2">
            <div 
              className="w-3 h-3 rounded-full" 
              style={{ backgroundColor: item.color }}
            />
            <span className="text-gray-600">{item.name}</span>
          </div>
        ))}
      </div>*/}

      {/* Chart */}
      {/*<ResponsiveContainer width="100%" height={300}>
        <LineChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis 
            dataKey="date" 
            tick={{ fontSize: 12 }}
            stroke="#999"
          />
          <YAxis 
            tick={{ fontSize: 12 }}
            stroke="#999"
          />
          <Tooltip />
          <Line type="monotone" dataKey="KR Deposit" stroke="#ef4444" strokeWidth={2} dot={false} />
          <Line type="monotone" dataKey="ATAD SRI LANKA" stroke="#eab308" strokeWidth={2} dot={false} />
          <Line type="monotone" dataKey="WTW Clipped" stroke="#22c55e" strokeWidth={2} dot={false} />
          <Line type="monotone" dataKey="KS withdrwal" stroke="#3b82f6" strokeWidth={2} dot={false} />
          <Line type="monotone" dataKey="PI Project" stroke="#a855f7" strokeWidth={2} dot={false} />
          <Line type="monotone" dataKey="WTW Whitelabel" stroke="#ec4899" strokeWidth={2} dot={false} />
        </LineChart>
      </ResponsiveContainer>*/}
    </div>
  );
}
