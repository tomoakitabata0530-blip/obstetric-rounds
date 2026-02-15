const { useState, useEffect } = React;

function App() {
  const updateSchedules = (patient) => {
    const today = new Date();
    today.setHours(0,0,0,0);
    const todayStr = today.toDateString();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const lastUpdate = patient.lastUpdateDate ? new Date(patient.lastUpdateDate) : null;
    if(lastUpdate) lastUpdate.setHours(0,0,0,0);
    if(lastUpdate && today.getTime() === lastUpdate.getTime()) return patient;
    
    let updatedToday = [];
    let updatedTomorrow = [];
    let updatedFuture = [...(patient.futureScheduleItems||[])];
    
    if(patient.todaySchedule?.length) {
      updatedToday = patient.todaySchedule.filter(t=>!t.completed).map(t=>({text:t.text,completed:false,id:Date.now()+Math.random()}));
    }
    if(patient.tomorrowSchedule?.length) {
      updatedToday = [...updatedToday, ...patient.tomorrowSchedule.map(i=>({text:i.text,completed:false,id:Date.now()+Math.random()}))];
    }
    
    const remainingFuture = [];
    updatedFuture.forEach(item => {
      if(!item.date) { remainingFuture.push(item); return; }
      const itemDate = new Date(item.date);
      itemDate.setHours(0,0,0,0);
      if(itemDate.getTime() === today.getTime()) {
        updatedToday.push({text:item.text,completed:false,id:Date.now()+Math.random()});
      } else if(itemDate.getTime() === tomorrow.getTime()) {
        updatedTomorrow.push({text:item.text,id:Date.now()+Math.random()});
      } else if(itemDate.getTime() > tomorrow.getTime()) {
        remainingFuture.push(item);
      }
    });
    
    return {
      ...patient,
      todaySchedule: updatedToday,
      tomorrowSchedule: updatedTomorrow,
      futureScheduleItems: remainingFuture,
      yesterdayBP: lastUpdate && lastUpdate.getTime()!==today.getTime() ? patient.todayBP||'' : patient.yesterdayBP||'',
      todayBP: lastUpdate && lastUpdate.getTime()!==today.getTime() ? '' : patient.todayBP||'',
      lastUpdateDate: todayStr
    };
  };

  const [patients, setPatients] = useState(() => {
    try {
      const saved = localStorage.getItem('obstetricPatients');
      if(saved) return JSON.parse(saved).map(p => updateSchedules(p));
    } catch(e) {
      console.error('Load error:', e);
    }
    return [];
  });

  useEffect(() => {
    try {
      localStorage.setItem('obstetricPatients', JSON.stringify(patients));
    } catch(e) {
      console.error('Save error:', e);
    }
  }, [patients]);

  useEffect(() => {
    const check = () => setPatients(prev => prev.map(p => updateSchedules(p)));
    check();
    const interval = setInterval(check, 60000);
    return () => clearInterval(interval);
  }, []);

  return React.createElement('div', {className:'min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 p-4'},
    React.createElement('div', {className:'max-w-4xl mx-auto'},
      React.createElement('div', {className:'bg-white rounded-lg shadow-lg p-6 mb-6'},
        React.createElement('h1', {className:'text-3xl font-bold text-gray-800 mb-2'}, '担当患者回診管理'),
        React.createElement('p', {className:'text-gray-600'}, '産科担当患者の情報を管理します')
      ),
      patients.length === 0 && React.createElement('div', {className:'bg-white rounded-lg shadow p-8 text-center text-gray-500'}, 
        '登録されている患者はいません。新規患者登録ボタンから患者を追加してください。'
      ),
      React.createElement('button', {
        onClick: () => {
          const name = prompt('患者氏名を入力:');
          if(!name) return;
          const edd = prompt('出産予定日を入力 (例: 2026-06-15):');
          if(!edd) return;
          const today = new Date();
          today.setHours(0,0,0,0);
          setPatients([...patients, {
            id: Date.now(),
            name,
            edd,
            roomNumber: '',
            doctor: '',
            admissionDate: '',
            todayBP: '',
            yesterdayBP: '',
            selectedProblems: [],
            freeTextProblems: '',
            subjective: '',
            todaySchedule: [],
            tomorrowSchedule: [],
            futureScheduleItems: [],
            lastUpdateDate: today.toDateString()
          }]);
          alert('患者を登録しました！');
        },
        className: 'bg-indigo-600 text-white px-6 py-3 rounded-lg hover:bg-indigo-700 mb-4'
      }, '✚ 簡易登録（テスト用）'),
      React.createElement('div', {className:'space-y-4'},
        patients.map(p => 
          React.createElement('div', {key: p.id, className:'bg-white rounded-lg shadow-lg p-6'},
            React.createElement('h3', {className:'text-2xl font-bold text-gray-800 mb-2'}, p.name),
            React.createElement('p', {className:'text-gray-600'}, `出産予定日: ${p.edd}`),
            React.createElement('button', {
              onClick: () => {
                if(confirm('削除しますか？')) {
                  setPatients(patients.filter(patient => patient.id !== p.id));
                }
              },
              className: 'mt-2 bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600'
            }, '削除')
          )
        )
      )
    )
  );
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(React.createElement(App));
