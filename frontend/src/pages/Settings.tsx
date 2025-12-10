import { useState } from 'react'
import { Save, Key, Users, Database, Bell } from 'lucide-react'
import { cn } from '../lib/utils'

const tabs = [
  { id: 'general', name: 'General', icon: Database },
  { id: 'team', name: 'Team', icon: Users },
  { id: 'api', name: 'API Keys', icon: Key },
  { id: 'notifications', name: 'Notifications', icon: Bell },
]

export function Settings() {
  const [activeTab, setActiveTab] = useState('general')

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-white">Settings</h1>
        <p className="text-gray-400 mt-1">Manage your workspace settings</p>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Sidebar */}
        <nav className="lg:w-48 flex-shrink-0">
          <ul className="space-y-1">
            {tabs.map((tab) => (
              <li key={tab.id}>
                <button
                  onClick={() => setActiveTab(tab.id)}
                  className={cn(
                    'w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                    activeTab === tab.id
                      ? 'bg-emerald-500/10 text-emerald-500'
                      : 'text-gray-400 hover:text-white hover:bg-gray-800'
                  )}
                >
                  <tab.icon className="h-5 w-5" />
                  {tab.name}
                </button>
              </li>
            ))}
          </ul>
        </nav>

        {/* Content */}
        <div className="flex-1 bg-gray-900 border border-gray-800 rounded-xl p-6">
          {activeTab === 'general' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-lg font-semibold text-white">Workspace Settings</h2>
                <p className="text-sm text-gray-400 mt-1">
                  Configure your workspace preferences
                </p>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Workspace Name
                  </label>
                  <input
                    type="text"
                    defaultValue="My Workspace"
                    className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Default Region
                  </label>
                  <select className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-emerald-500">
                    <option>United States (US)</option>
                    <option>United Kingdom (GB)</option>
                    <option>Canada (CA)</option>
                    <option>Germany (DE)</option>
                    <option>Global</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Timezone
                  </label>
                  <select className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-emerald-500">
                    <option>America/New_York (EST)</option>
                    <option>America/Los_Angeles (PST)</option>
                    <option>Europe/London (GMT)</option>
                    <option>UTC</option>
                  </select>
                </div>
              </div>

              <button className="flex items-center gap-2 px-4 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-colors">
                <Save className="h-4 w-4" />
                Save Changes
              </button>
            </div>
          )}

          {activeTab === 'team' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-lg font-semibold text-white">Team Members</h2>
                <p className="text-sm text-gray-400 mt-1">
                  Manage who has access to this workspace
                </p>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between p-4 bg-gray-800 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-emerald-500/20 flex items-center justify-center">
                      <span className="text-emerald-500 font-medium">U</span>
                    </div>
                    <div>
                      <p className="text-white font-medium">user@example.com</p>
                      <p className="text-sm text-gray-400">Owner</p>
                    </div>
                  </div>
                  <span className="px-2 py-1 bg-emerald-500/10 text-emerald-500 text-xs rounded-full">
                    Owner
                  </span>
                </div>
              </div>

              <button className="px-4 py-2 border border-gray-700 text-gray-300 rounded-lg hover:bg-gray-800 transition-colors">
                Invite Team Member
              </button>
            </div>
          )}

          {activeTab === 'api' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-lg font-semibold text-white">API Keys</h2>
                <p className="text-sm text-gray-400 mt-1">
                  Manage API keys for programmatic access
                </p>
              </div>

              <div className="p-4 bg-gray-800 rounded-lg border border-gray-700">
                <p className="text-sm text-gray-400">No API keys created yet</p>
              </div>

              <button className="flex items-center gap-2 px-4 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-colors">
                <Key className="h-4 w-4" />
                Generate New Key
              </button>
            </div>
          )}

          {activeTab === 'notifications' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-lg font-semibold text-white">Notifications</h2>
                <p className="text-sm text-gray-400 mt-1">
                  Configure how you receive alerts
                </p>
              </div>

              <div className="space-y-4">
                <label className="flex items-center justify-between p-4 bg-gray-800 rounded-lg cursor-pointer">
                  <div>
                    <p className="text-white font-medium">Email Notifications</p>
                    <p className="text-sm text-gray-400">Get notified about new trending keywords</p>
                  </div>
                  <input
                    type="checkbox"
                    defaultChecked
                    className="h-5 w-5 rounded border-gray-600 bg-gray-700 text-emerald-500 focus:ring-emerald-500"
                  />
                </label>

                <label className="flex items-center justify-between p-4 bg-gray-800 rounded-lg cursor-pointer">
                  <div>
                    <p className="text-white font-medium">Mission Alerts</p>
                    <p className="text-sm text-gray-400">Get notified when missions fail</p>
                  </div>
                  <input
                    type="checkbox"
                    defaultChecked
                    className="h-5 w-5 rounded border-gray-600 bg-gray-700 text-emerald-500 focus:ring-emerald-500"
                  />
                </label>

                <label className="flex items-center justify-between p-4 bg-gray-800 rounded-lg cursor-pointer">
                  <div>
                    <p className="text-white font-medium">Weekly Summary</p>
                    <p className="text-sm text-gray-400">Receive weekly trend reports</p>
                  </div>
                  <input
                    type="checkbox"
                    className="h-5 w-5 rounded border-gray-600 bg-gray-700 text-emerald-500 focus:ring-emerald-500"
                  />
                </label>
              </div>

              <button className="flex items-center gap-2 px-4 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-colors">
                <Save className="h-4 w-4" />
                Save Preferences
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
