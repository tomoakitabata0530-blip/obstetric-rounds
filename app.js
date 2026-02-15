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
      subjective: lastUpdate && lastUpdate.getTime()!==today.getTime() ? '' : patient.subjective||'',
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

  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [showAllTasks, setShowAllTasks] = useState(false);
  const [sortBy, setSortBy] = useState('none');
  
  const [formData, setFormData] = useState({
    patientId:'', name:'', roomNumber:'', doctor:'', edd:'', admissionDate:'', todayBP:'', yesterdayBP:'',
    selectedProblems:[], freeTextProblems:'', subjective:'',
    todaySchedule:[], tomorrowSchedule:[], futureScheduleItems:[]
  });
  
  const [newScheduleItem, setNewScheduleItem] = useState('');
  const [newScheduleTime, setNewScheduleTime] = useState('');
  const [newTomorrowItem, setNewTomorrowItem] = useState('');
  const [newTomorrowTime, setNewTomorrowTime] = useState('');
  const [newFuture, setNewFuture] = useState({date:'',text:'',time:''});

  const commonProblems = ['妊娠糖尿病','妊娠高血圧症候群','前置胎盤','切迫早産','多胎妊娠','前期破水','胎児発育不全','羊水過多','羊水過少','常位胎盤早期剥離','子宮内胎児死亡','帝王切開既往'];

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

  const calcGA = (edd, targetDate) => {
    if(!edd) return '-';
    const dueDate = new Date(edd);
    const checkDate = targetDate ? new Date(targetDate) : new Date();
    checkDate.setHours(0,0,0,0);
    const lmp = new Date(dueDate);
    lmp.setDate(lmp.getDate()-280);
    const diffDays = Math.floor((checkDate-lmp)/(1000*60*60*24));
    const weeks = Math.floor(diffDays/7);
    const days = diffDays%7;
    if(weeks<0) return '未妊娠';
    if(weeks>42) return '産後';
    return `${weeks}週${days}日`;
  };

  const resetForm = () => {
    setFormData({patientId:'',name:'',roomNumber:'',doctor:'',edd:'',admissionDate:'',todayBP:'',yesterdayBP:'',selectedProblems:[],freeTextProblems:'',subjective:'',todaySchedule:[],tomorrowSchedule:[],futureScheduleItems:[]});
    setNewScheduleItem(''); setNewScheduleTime(''); setNewTomorrowItem(''); setNewTomorrowTime('');
    setNewFuture({date:'',text:'',time:''});
    setIsAdding(false); setEditingId(null);
  };

  const addPatient = () => {
    if(!formData.name||!formData.edd) { alert('氏名と出産予定日は必須です'); return; }
    const today = new Date(); today.setHours(0,0,0,0);
    setPatients([...patients, {id:Date.now(),...formData,lastUpdateDate:today.toDateString()}]);
    resetForm();
  };

  const updatePatient = () => {
    if(!formData.name||!formData.edd) { alert('氏名と出産予定日は必須です'); return; }
    setPatients(patients.map(p => p.id===editingId ? {...p,...formData} : p));
    resetForm();
  };

  const deletePatient = (id) => {
    if(confirm('この患者情報を削除しますか?')) setPatients(patients.filter(p => p.id!==id));
  };

  const startEdit = (patient) => {
    setEditingId(patient.id);
    setFormData({
      patientId:patient.patientId||'', name:patient.name, roomNumber:patient.roomNumber||'', doctor:patient.doctor||'',
      edd:patient.edd, admissionDate:patient.admissionDate||'', todayBP:patient.todayBP||'',
      yesterdayBP:patient.yesterdayBP||'', selectedProblems:patient.selectedProblems||[],
      freeTextProblems:patient.freeTextProblems||'', subjective:patient.subjective||'',
      todaySchedule:patient.todaySchedule||[], tomorrowSchedule:patient.tomorrowSchedule||[],
      futureScheduleItems:patient.futureScheduleItems||[]
    });
    setIsAdding(false);
  };

  const toggleProblem = (problem) => {
    setFormData(prev => ({
      ...prev,
      selectedProblems: prev.selectedProblems.includes(problem)
        ? prev.selectedProblems.filter(p => p!==problem)
        : [...prev.selectedProblems, problem]
    }));
  };

  const getCombinedProblems = (patient) => {
    const problems = [];
    if(patient.selectedProblems?.length) problems.push(...patient.selectedProblems.map(p=>`#${p}`));
    if(patient.freeTextProblems?.trim()) {
      const free = patient.freeTextProblems.split('\n').map(l=>l.trim()).filter(l=>l).map(l=>l.startsWith('#')?l:`#${l}`);
      problems.push(...free);
    }
    return problems;
  };

  const addTodaySchedule = () => {
    if(!newScheduleItem.trim()) return;
    const text = newScheduleTime ? `${newScheduleItem} (${newScheduleTime})` : newScheduleItem;
    setFormData(prev => ({...prev, todaySchedule:[...prev.todaySchedule, {text,completed:false,id:Date.now()}]}));
    setNewScheduleItem(''); setNewScheduleTime('');
  };

  const addQuickToday = (text) => {
    const scheduleText = newScheduleTime ? `${text} (${newScheduleTime})` : text;
    setFormData(prev => ({...prev, todaySchedule:[...prev.todaySchedule, {text:scheduleText,completed:false,id:Date.now()}]}));
    setNewScheduleTime('');
  };

  const removeTodaySchedule = (id) => {
    setFormData(prev => ({...prev, todaySchedule:prev.todaySchedule.filter(i=>i.id!==id)}));
  };

  const toggleTodaySchedule = (id) => {
    setFormData(prev => ({...prev, todaySchedule:prev.todaySchedule.map(i=>i.id===id?{...i,completed:!i.completed}:i)}));
  };

  const addTomorrowSchedule = () => {
    if(!newTomorrowItem.trim()) return;
    const text = newTomorrowTime ? `${newTomorrowItem} (${newTomorrowTime})` : newTomorrowItem;
    setFormData(prev => ({...prev, tomorrowSchedule:[...prev.tomorrowSchedule, {text,id:Date.now()}]}));
    setNewTomorrowItem(''); setNewTomorrowTime('');
  };

  const addQuickTomorrow = (text) => {
    const scheduleText = newTomorrowTime ? `${text} (${newTomorrowTime})` : text;
    setFormData(prev => ({...prev, tomorrowSchedule:[...prev.tomorrowSchedule, {text:scheduleText,id:Date.now()}]}));
    setNewTomorrowTime('');
  };

  const removeTomorrowSchedule = (id) => {
    setFormData(prev => ({...prev, tomorrowSchedule:prev.tomorrowSchedule.filter(i=>i.id!==id)}));
  };

  const addFutureSchedule = () => {
    if(!newFuture.text.trim()) { alert('予定内容を入力してください'); return; }
    if(!newFuture.date) {
      setFormData(prev => ({...prev, futureScheduleItems:[...prev.futureScheduleItems, {id:Date.now(),date:null,text:newFuture.text,time:''}]}));
      setNewFuture({date:'',text:'',time:''});
      return;
    }
    const text = newFuture.time ? `${newFuture.text} (${newFuture.time})` : newFuture.text;
    setFormData(prev => ({...prev, futureScheduleItems:[...prev.futureScheduleItems, {id:Date.now(),date:newFuture.date,text,time:newFuture.time}]}));
    setNewFuture({date:'',text:'',time:''});
  };

  const addQuickFuture = (text) => {
    if(!newFuture.date) { alert('日付を選択してください'); return; }
    const scheduleText = text==='IC' && newFuture.time ? `${text} (${newFuture.time})` : text;
    setFormData(prev => ({...prev, futureScheduleItems:[...prev.futureScheduleItems, {id:Date.now(),date:newFuture.date,text:scheduleText,time:text==='IC'?newFuture.time:''}]}));
    setNewFuture({date:'',text:'',time:''});
  };

  const removeFutureSchedule = (id) => {
    setFormData(prev => ({...prev, futureScheduleItems:prev.futureScheduleItems.filter(i=>i.id!==id)}));
  };

  const getSorted = () => {
    const sorted = [...patients];
    if(sortBy==='doctor') return sorted.sort((a,b)=>(a.doctor||'').localeCompare(b.doctor||'','ja'));
    if(sortBy==='room') return sorted.sort((a,b)=>(parseInt(a.roomNumber)||0)-(parseInt(b.roomNumber)||0));
    if(sortBy==='weeks') {
      return sorted.sort((a,b)=>{
        if(!a.edd||!b.edd) return 0;
        const today=new Date(); today.setHours(0,0,0,0);
        const getDays=(edd)=>{
          const due=new Date(edd); const lmp=new Date(due);
          lmp.setDate(lmp.getDate()-280);
          return Math.floor((today-lmp)/(1000*60*60*24));
        };
        return getDays(b.edd)-getDays(a.edd);
      });
    }
    return sorted;
  };

  const getAllTasks = () => {
    return patients.flatMap(p=>(p.todaySchedule||[]).map(t=>({...t,patientId:p.id,patientName:p.name})));
  };

  const completeTask = (patientId, taskId) => {
    setPatients(prev=>prev.map(p=>{
      if(p.id===patientId) return {...p, todaySchedule:p.todaySchedule.map(t=>t.id===taskId?{...t,completed:!t.completed}:t)};
      return p;
    }));
  };

  // 入力フォーム
  if(isAdding || editingId) {
    return React.createElement('div', {className:'min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50'},
      React.createElement('div', {className:'pb-32'},
        React.createElement('div', {className:'bg-white shadow-sm sticky top-0 z-10 px-4 py-4 border-b'},
          React.createElement('h2', {className:'text-xl font-bold text-gray-800'}, editingId ? '患者情報編集' : '新規患者登録')
        ),
        
        React.createElement('div', {className:'px-4 py-6 space-y-6'},
          // 患者ID
          React.createElement('div', null,
            React.createElement('label', {className:'block text-sm font-medium text-gray-700 mb-2'}, '患者ID'),
            React.createElement('input', {type:'text', value:formData.patientId, onChange:(e)=>setFormData({...formData,patientId:e.target.value}), className:'w-full px-4 py-3 border border-gray-300 rounded-lg text-base', placeholder:'12345'})
          ),
          
          // 氏名
          React.createElement('div', null,
            React.createElement('label', {className:'block text-sm font-medium text-gray-700 mb-2'}, '氏名 *'),
            React.createElement('input', {type:'text', value:formData.name, onChange:(e)=>setFormData({...formData,name:e.target.value}), className:'w-full px-4 py-3 border border-gray-300 rounded-lg text-base', placeholder:'山田花子'})
          ),
          
          // 病室・主治医
          React.createElement('div', {className:'grid grid-cols-2 gap-4'},
            React.createElement('div', null,
              React.createElement('label', {className:'block text-sm font-medium text-gray-700 mb-2'}, '病室'),
              React.createElement('input', {type:'text', value:formData.roomNumber, onChange:(e)=>setFormData({...formData,roomNumber:e.target.value}), className:'w-full px-4 py-3 border border-gray-300 rounded-lg text-base', placeholder:'301'})
            ),
            React.createElement('div', null,
              React.createElement('label', {className:'block text-sm font-medium text-gray-700 mb-2'}, '主治医'),
              React.createElement('input', {type:'text', value:formData.doctor, onChange:(e)=>setFormData({...formData,doctor:e.target.value}), className:'w-full px-4 py-3 border border-gray-300 rounded-lg text-base', placeholder:'田中'})
            )
          ),
          
          // 出産予定日・入院日
          React.createElement('div', {className:'grid grid-cols-2 gap-4'},
            React.createElement('div', null,
              React.createElement('label', {className:'block text-sm font-medium text-gray-700 mb-2'}, '出産予定日 *'),
              React.createElement('input', {type:'date', value:formData.edd, onChange:(e)=>setFormData({...formData,edd:e.target.value}), className:'w-full px-3 py-3 border border-gray-300 rounded-lg text-base'})
            ),
            React.createElement('div', null,
              React.createElement('label', {className:'block text-sm font-medium text-gray-700 mb-2'}, '入院日'),
              React.createElement('input', {type:'date', value:formData.admissionDate, onChange:(e)=>setFormData({...formData,admissionDate:e.target.value}), className:'w-full px-3 py-3 border border-gray-300 rounded-lg text-base'})
            )
          ),
          
          // 血圧
          React.createElement('div', {className:'grid grid-cols-2 gap-4'},
            React.createElement('div', null,
              React.createElement('label', {className:'block text-sm font-medium text-gray-700 mb-2'}, '本日BP'),
              React.createElement('input', {type:'text', value:formData.todayBP, onChange:(e)=>setFormData({...formData,todayBP:e.target.value}), className:'w-full px-4 py-3 border border-gray-300 rounded-lg text-base', placeholder:'120/80'})
            ),
            React.createElement('div', null,
              React.createElement('label', {className:'block text-sm font-medium text-gray-700 mb-2'}, '昨日BP'),
              React.createElement('input', {type:'text', value:formData.yesterdayBP, onChange:(e)=>setFormData({...formData,yesterdayBP:e.target.value}), className:'w-full px-4 py-3 border border-gray-300 rounded-lg text-base', placeholder:'118/78'})
            )
          ),

          // プロブレム
          React.createElement('div', null,
            React.createElement('label', {className:'block text-sm font-medium text-gray-700 mb-3'}, 'プロブレム（選択）'),
            React.createElement('div', {className:'grid grid-cols-2 gap-2'},
              commonProblems.map(p=>
                React.createElement('button', {
                  key:p,
                  type:'button',
                  onClick:()=>toggleProblem(p),
                  className:`px-3 py-2 rounded-lg text-sm ${formData.selectedProblems.includes(p)?'bg-amber-500 text-white':'bg-gray-100 text-gray-700'}`
                }, p)
              )
            ),
            React.createElement('label', {className:'block text-sm font-medium text-gray-700 mt-4 mb-2'}, 'プロブレム（自由記述）'),
            React.createElement('textarea', {value:formData.freeTextProblems, onChange:(e)=>setFormData({...formData,freeTextProblems:e.target.value}), className:'w-full px-4 py-3 border border-gray-300 rounded-lg text-base', rows:3, placeholder:'1行に1つずつ記入'})
          ),

          // S) 主観的情報 with 特になしボタン
          React.createElement('div', null,
            React.createElement('label', {className:'block text-sm font-medium text-gray-700 mb-2'}, 'S) 主観的情報'),
            React.createElement('div', {className:'mb-2'},
              React.createElement('button', {
                type:'button',
                onClick:()=>setFormData({...formData,subjective:'特になし'}),
                className:'px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium'
              }, '特になし')
            ),
            React.createElement('textarea', {value:formData.subjective, onChange:(e)=>setFormData({...formData,subjective:e.target.value}), className:'w-full px-4 py-3 border border-gray-300 rounded-lg text-base', rows:3, placeholder:'患者の訴えなど'})
          ),

          // 本日の予定
          React.createElement('div', null,
            React.createElement('label', {className:'block text-sm font-medium text-gray-700 mb-3'}, '本日の予定'),
            React.createElement('div', {className:'space-y-2 mb-3'},
              React.createElement('input', {type:'text', value:newScheduleItem, onChange:(e)=>setNewScheduleItem(e.target.value), onKeyPress:(e)=>e.key==='Enter'&&addTodaySchedule(), className:'w-full px-4 py-3 border border-gray-300 rounded-lg text-base', placeholder:'予定内容'}),
              React.createElement('div', {className:'flex gap-2'},
                React.createElement('input', {type:'time', value:newScheduleTime, onChange:(e)=>setNewScheduleTime(e.target.value), className:'flex-1 px-4 py-3 border border-gray-300 rounded-lg text-base'}),
                React.createElement('button', {onClick:addTodaySchedule, className:'px-6 py-3 bg-blue-600 text-white rounded-lg text-base font-medium'}, '追加')
              )
            ),
            React.createElement('div', {className:'grid grid-cols-3 gap-2 mb-3'},
              ['血液検査','術前検査','帝王切開','IC','他科コンサルト','他科受診'].map(t=>
                React.createElement('button', {key:t, onClick:()=>addQuickToday(t), className:'px-2 py-2 bg-blue-100 text-blue-700 rounded text-xs font-medium'}, t)
              )
            ),
            React.createElement('div', {className:'space-y-2'},
              formData.todaySchedule.map(item=>
                React.createElement('div', {key:item.id, className:'flex items-center gap-2 bg-blue-50 p-3 rounded-lg'},
                  React.createElement('button', {onClick:()=>toggleTodaySchedule(item.id), className:'text-xl'}, item.completed?'✓':'○'),
                  React.createElement('span', {className:`flex-1 text-sm ${item.completed?'line-through text-gray-400':'text-gray-700'}`}, item.text),
                  React.createElement('button', {onClick:()=>removeTodaySchedule(item.id), className:'text-red-600 text-xl'}, '×')
                )
              )
            )
          ),

          // 明日の予定
          React.createElement('div', null,
            React.createElement('label', {className:'block text-sm font-medium text-gray-700 mb-3'}, '明日の予定'),
            React.createElement('div', {className:'space-y-2 mb-3'},
              React.createElement('input', {type:'text', value:newTomorrowItem, onChange:(e)=>setNewTomorrowItem(e.target.value), onKeyPress:(e)=>e.key==='Enter'&&addTomorrowSchedule(), className:'w-full px-4 py-3 border border-gray-300 rounded-lg text-base', placeholder:'予定内容'}),
              React.createElement('div', {className:'flex gap-2'},
                React.createElement('input', {type:'time', value:newTomorrowTime, onChange:(e)=>setNewTomorrowTime(e.target.value), className:'flex-1 px-4 py-3 border border-gray-300 rounded-lg text-base'}),
                React.createElement('button', {onClick:addTomorrowSchedule, className:'px-6 py-3 bg-green-600 text-white rounded-lg text-base font-medium'}, '追加')
              )
            ),
            React.createElement('div', {className:'grid grid-cols-3 gap-2 mb-3'},
              ['血液検査','術前検査','帝王切開','IC','他科コンサルト','他科受診'].map(t=>
                React.createElement('button', {key:t, onClick:()=>addQuickTomorrow(t), className:'px-2 py-2 bg-green-100 text-green-700 rounded text-xs font-medium'}, t)
              )
            ),
            React.createElement('div', {className:'space-y-2'},
              formData.tomorrowSchedule.map(item=>
                React.createElement('div', {key:item.id, className:'flex items-center gap-2 bg-green-50 p-3 rounded-lg'},
                  React.createElement('span', {className:'flex-1 text-sm text-gray-700'}, item.text),
                  React.createElement('button', {onClick:()=>removeTomorrowSchedule(item.id), className:'text-red-600 text-xl'}, '×')
                )
              )
            )
          ),

          // 今後の予定
          React.createElement('div', null,
            React.createElement('label', {className:'block text-sm font-medium text-gray-700 mb-3'}, '今後の予定'),
            React.createElement('div', {className:'space-y-2 mb-3'},
              React.createElement('div', {className:'grid grid-cols-2 gap-2'},
                React.createElement('input', {type:'date', value:newFuture.date, onChange:(e)=>setNewFuture({...newFuture,date:e.target.value}), className:'px-3 py-3 border border-gray-300 rounded-lg text-base'}),
                React.createElement('input', {type:'time', value:newFuture.time, onChange:(e)=>setNewFuture({...newFuture,time:e.target.value}), className:'px-3 py-3 border border-gray-300 rounded-lg text-base'})
              ),
              React.createElement('div', {className:'flex gap-2'},
                React.createElement('input', {type:'text', value:newFuture.text, onChange:(e)=>setNewFuture({...newFuture,text:e.target.value}), onKeyPress:(e)=>e.key==='Enter'&&addFutureSchedule(), className:'flex-1 px-4 py-3 border border-gray-300 rounded-lg text-base', placeholder:'予定内容'}),
                React.createElement('button', {onClick:addFutureSchedule, className:'px-6 py-3 bg-purple-600 text-white rounded-lg text-base font-medium'}, '追加')
              )
            ),
            newFuture.date && formData.edd && React.createElement('div', {className:'text-sm text-blue-600 font-medium mb-2'}, `妊娠週数: ${calcGA(formData.edd, newFuture.date)}`),
            React.createElement('div', {className:'grid grid-cols-3 gap-2 mb-3'},
              ['血液検査','術前検査','帝王切開','IC','他科コンサルト','他科受診'].map(t=>
                React.createElement('button', {key:t, onClick:()=>addQuickFuture(t), className:'px-2 py-2 bg-purple-100 text-purple-700 rounded text-xs font-medium'}, t)
              )
            ),
            React.createElement('div', {className:'space-y-2'},
              formData.futureScheduleItems.map(item=>
                React.createElement('div', {key:item.id, className:'flex items-center gap-2 bg-purple-50 p-3 rounded-lg'},
                  item.date && React.createElement('span', {className:'text-purple-700 font-medium text-xs shrink-0'}, new Date(item.date).toLocaleDateString('ja-JP',{month:'short',day:'numeric'})),
                  React.createElement('span', {className:'flex-1 text-sm text-gray-700'}, item.text),
                  React.createElement('button', {onClick:()=>removeFutureSchedule(item.id), className:'text-red-600 text-xl'}, '×')
                )
              )
            )
          )
        ),

        // 固定ボタン
        React.createElement('div', {className:'fixed bottom-0 left-0 right-0 bg-white border-t p-4'},
          React.createElement('div', {className:'flex gap-3'},
            React.createElement('button', {onClick:editingId?updatePatient:addPatient, className:'flex-1 bg-indigo-600 text-white py-4 rounded-lg font-bold text-lg'}, editingId?'更新':'登録'),
            React.createElement('button', {onClick:resetForm, className:'px-6 py-4 bg-gray-300 text-gray-700 rounded-lg font-bold text-lg'}, 'キャンセル')
          )
        )
      )
    );
  }

  // メイン画面
  return React.createElement('div', {className:'min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50'},
    React.createElement('div', {className:'p-4 space-y-4'},
      React.createElement('div', {className:'bg-white rounded-lg shadow p-4'},
        React.createElement('h1', {className:'text-2xl font-bold text-gray-800'}, '担当患者回診管理'),
        React.createElement('p', {className:'text-gray-600 text-sm mt-1'}, '産科担当患者の情報を管理します')
      ),
      
      React.createElement('div', {className:'space-y-3'},
        React.createElement('div', {className:'grid grid-cols-2 gap-3'},
          React.createElement('button', {onClick:()=>setIsAdding(true), className:'bg-indigo-600 text-white py-4 rounded-lg text-base font-bold'}, '新規患者登録'),
          React.createElement('button', {onClick:()=>setShowAllTasks(!showAllTasks), className:'bg-green-600 text-white py-4 rounded-lg text-base font-bold'}, showAllTasks?'患者別':'タスク一覧')
        ),
        React.createElement('div', {className:'bg-white rounded-lg p-3 shadow flex items-center gap-3'},
          React.createElement('label', {className:'text-sm font-medium text-gray-700'}, '表示順:'),
          React.createElement('select', {value:sortBy, onChange:(e)=>setSortBy(e.target.value), className:'flex-1 px-3 py-2 border border-gray-300 rounded text-base'},
            React.createElement('option', {value:'none'}, '登録順'),
            React.createElement('option', {value:'doctor'}, '主治医別'),
            React.createElement('option', {value:'room'}, '病室順'),
            React.createElement('option', {value:'weeks'}, '妊娠週数順')
          )
        )
      ),

      patients.length===0 && React.createElement('div', {className:'bg-white rounded-lg shadow p-8 text-center text-gray-500'}, '登録されている患者はいません'),

      showAllTasks && patients.length>0 && React.createElement('div', {className:'bg-white rounded-lg shadow p-4'},
        React.createElement('h2', {className:'text-xl font-bold text-gray-800 mb-4'}, '本日のタスク一覧'),
        getAllTasks().length===0 ? React.createElement('p', {className:'text-gray-500 text-center py-4'}, '本日のタスクはありません') :
        React.createElement('div', {className:'space-y-3'}, getAllTasks().map(task=>
          React.createElement('div', {key:`${task.patientId}-${task.id}`, className:`flex items-center gap-3 p-3 rounded-lg ${task.completed?'bg-gray-100':'bg-blue-50'}`},
            React.createElement('button', {onClick:()=>completeTask(task.patientId,task.id), className:'text-xl'}, task.completed?'✓':'○'),
            React.createElement('div', {className:'flex-1'},
              React.createElement('div', {className:`font-bold text-base ${task.completed?'text-gray-400 line-through':'text-indigo-700'}`}, task.patientName),
              React.createElement('div', {className:`text-sm ${task.completed?'text-gray-400 line-through':'text-gray-700'}`}, task.text)
            )
          )
        ))
      ),

      !showAllTasks && getSorted().map(patient=>
        React.createElement('div', {key:patient.id, className:'bg-white rounded-lg shadow p-4'},
          React.createElement('div', {className:'flex justify-between items-start mb-3'},
            React.createElement('div', {className:'flex-1'},
              React.createElement('div', {className:'flex flex-wrap items-center gap-2 mb-2'},
                patient.patientId && React.createElement('span', {className:'px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs font-semibold'}, `ID:${patient.patientId}`),
                React.createElement('h3', {className:'text-xl font-bold text-gray-800'}, patient.name),
                patient.roomNumber && React.createElement('span', {className:'px-2 py-1 bg-indigo-100 text-indigo-700 rounded text-xs font-semibold'}, `${patient.roomNumber}号室`),
                patient.doctor && React.createElement('span', {className:'px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs font-semibold'}, patient.doctor)
              ),
              React.createElement('div', {className:'space-y-1 text-sm'},
                React.createElement('div', null,
                  React.createElement('span', {className:'text-gray-600'}, '予定日: '),
                  React.createElement('span', {className:'font-semibold text-gray-800'}, new Date(patient.edd).toLocaleDateString('ja-JP',{month:'long',day:'numeric'}))
                ),
                React.createElement('div', null,
                  React.createElement('span', {className:'text-gray-600'}, '週数: '),
                  React.createElement('span', {className:'font-bold text-indigo-600 text-base'}, calcGA(patient.edd))
                ),
                patient.admissionDate && React.createElement('div', null,
                  React.createElement('span', {className:'text-gray-600'}, '入院: '),
                  React.createElement('span', {className:'font-semibold text-gray-800'}, (()=>{
                    const adm=new Date(patient.admissionDate); const today=new Date();
                    adm.setHours(0,0,0,0); today.setHours(0,0,0,0);
                    return `${Math.floor((today-adm)/(1000*60*60*24))+1}日目`;
                  })())
                ),
                patient.todayBP && React.createElement('div', null, React.createElement('span', {className:'text-gray-600'}, '本日BP: '), React.createElement('span', {className:'font-semibold'}, patient.todayBP)),
                patient.yesterdayBP && React.createElement('div', null, React.createElement('span', {className:'text-gray-600'}, '昨日BP: '), React.createElement('span', {className:'text-gray-500'}, patient.yesterdayBP))
              )
            ),
            React.createElement('div', {className:'flex gap-2'},
              React.createElement('button', {onClick:()=>startEdit(patient), className:'p-2 text-blue-600 bg-blue-50 rounded text-xl'}, '✏️'),
              React.createElement('button', {onClick:()=>deletePatient(patient.id), className:'p-2 text-red-600 bg-red-50 rounded text-xl'}, '🗑️')
            )
          ),

          getCombinedProblems(patient).length>0 && React.createElement('div', {className:'bg-amber-50 border-l-4 border-amber-400 p-3 rounded mb-3'},
            React.createElement('h4', {className:'font-bold text-gray-700 mb-2 text-sm'}, 'プロブレム'),
            React.createElement('div', {className:'flex flex-wrap gap-1'}, getCombinedProblems(patient).map((p,i)=>
              React.createElement('span', {key:i, className:'bg-white px-2 py-1 rounded text-xs text-gray-700 border border-amber-200'}, p)
            ))
          ),

          patient.subjective?.trim() && React.createElement('div', {className:'bg-gray-50 border-l-4 border-gray-400 p-3 rounded mb-3'},
            React.createElement('h4', {className:'font-bold text-gray-700 mb-1 text-sm'}, 'S) 主観的情報'),
            React.createElement('p', {className:'text-sm text-gray-700 whitespace-pre-wrap'}, patient.subjective)
          ),

          React.createElement('div', {className:'bg-blue-50 border-l-4 border-blue-400 p-3 rounded mb-3'},
            React.createElement('h4', {className:'font-bold text-gray-700 mb-2 text-sm'}, '本日の予定'),
            patient.todaySchedule?.length>0 ? React.createElement('div', {className:'space-y-1'}, patient.todaySchedule.map(item=>
              React.createElement('div', {key:item.id, className:'flex items-center gap-2'},
                React.createElement('span', {className:'text-base'}, item.completed?'✓':'○'),
                React.createElement('span', {className:`text-sm ${item.completed?'line-through text-gray-400':'text-gray-700'}`}, item.text)
              )
            )) : React.createElement('p', {className:'text-sm text-gray-500'}, 'なし')
          ),

          React.createElement('div', {className:'bg-green-50 border-l-4 border-green-400 p-3 rounded mb-3'},
            React.createElement('h4', {className:'font-bold text-gray-700 mb-2 text-sm'}, '明日の予定'),
            patient.tomorrowSchedule?.length>0 ? React.createElement('div', {className:'space-y-1'}, patient.tomorrowSchedule.map(item=>
              React.createElement('div', {key:item.id, className:'flex items-start gap-2 text-sm text-gray-700'},
                React.createElement('span', null, '•'),
                React.createElement('span', null, item.text)
              )
            )) : React.createElement('p', {className:'text-sm text-gray-500'}, 'なし')
          ),

          patient.futureScheduleItems?.length>0 && React.createElement('div', {className:'bg-purple-50 border-l-4 border-purple-400 p-3 rounded'},
            React.createElement('h4', {className:'font-bold text-gray-700 mb-2 text-sm'}, '今後の予定'),
            React.createElement('div', {className:'space-y-1'}, patient.futureScheduleItems.sort((a,b)=>{
              if(!a.date&&!b.date)return 0; if(!a.date)return 1; if(!b.date)return -1;
              return new Date(a.date)-new Date(b.date);
            }).map(item=>
              React.createElement('div', {key:item.id, className:'flex items-start gap-2 text-sm text-gray-700'},
                React.createElement('span', null, '•'),
                React.createElement('div', null,
                  item.date && React.createElement('span', {className:'font-medium text-purple-700'}, new Date(item.date).toLocaleDateString('ja-JP',{month:'short',day:'numeric'})+' - '),
                  item.text
                )
              )
            ))
          )
        )
      )
    )
  );
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(React.createElement(App));
