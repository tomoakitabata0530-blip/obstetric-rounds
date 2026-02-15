const { useState, useEffect } = React;
const e = React.createElement;

const App = () => {
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
    const saved = localStorage.getItem('obstetricPatients');
    if(saved) return JSON.parse(saved).map(p => updateSchedules(p));
    return [];
  });

  useEffect(() => {
    localStorage.setItem('obstetricPatients', JSON.stringify(patients));
  }, [patients]);

  useEffect(() => {
    const check = () => setPatients(prev => prev.map(p => updateSchedules(p)));
    check();
    const interval = setInterval(check, 60000);
    return () => clearInterval(interval);
  }, []);

  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [showAllTasks, setShowAllTasks] = useState(false);
  const [sortBy, setSortBy] = useState('none');
  const [formData, setFormData] = useState({
    name:'', roomNumber:'', doctor:'', edd:'', admissionDate:'', todayBP:'', yesterdayBP:'',
    selectedProblems:[], freeTextProblems:'', subjective:'',
    todaySchedule:[], tomorrowSchedule:[], futureScheduleItems:[]
  });
  const [newScheduleItem, setNewScheduleItem] = useState('');
  const [newScheduleTime, setNewScheduleTime] = useState('');
  const [newTomorrowItem, setNewTomorrowItem] = useState('');
  const [newTomorrowTime, setNewTomorrowTime] = useState('');
  const [newFuture, setNewFuture] = useState({date:'',text:'',time:''});

  const commonProblems = ['妊娠糖尿病','妊娠高血圧症候群','前置胎盤','切迫早産','多胎妊娠','前期破水','胎児発育不全','羊水過多','羊水過少','常位胎盤早期剥離','子宮内胎児死亡','帝王切開既往'];

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
    setFormData({name:'',roomNumber:'',doctor:'',edd:'',admissionDate:'',todayBP:'',yesterdayBP:'',selectedProblems:[],freeTextProblems:'',subjective:'',todaySchedule:[],tomorrowSchedule:[],futureScheduleItems:[]});
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
      name:patient.name, roomNumber:patient.roomNumber||'', doctor:patient.doctor||'',
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

  const removeFutureSchedule = (id) => {
    setFormData(prev => ({...prev, futureScheduleItems:prev.futureScheduleItems.filter(i=>i.id!==id)}));
  };

  const addQuickFuture = (text) => {
    if(!newFuture.date) { alert('日付を選択してください'); return; }
    const scheduleText = text==='IC' && newFuture.time ? `${text} (${newFuture.time})` : text;
    setFormData(prev => ({...prev, futureScheduleItems:[...prev.futureScheduleItems, {id:Date.now(),date:newFuture.date,text:scheduleText,time:text==='IC'?newFuture.time:''}]}));
    setNewFuture({date:'',text:'',time:''});
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

  return e('div', {className:'min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 p-4'},
    e('div', {className:'max-w-4xl mx-auto'},
      e('div', {className:'bg-white rounded-lg shadow-lg p-6 mb-6'},
        e('h1', {className:'text-3xl font-bold text-gray-800 mb-2'}, '担当患者回診管理'),
        e('p', {className:'text-gray-600'}, '産科担当患者の情報を管理します')
      ),
      !isAdding && !editingId && e('div', {className:'mb-6 flex gap-3 items-center flex-wrap'},
        e('button', {onClick:()=>setIsAdding(true), className:'bg-indigo-600 text-white px-6 py-3 rounded-lg hover:bg-indigo-700'}, '新規患者登録'),
        e('button', {onClick:()=>setShowAllTasks(!showAllTasks), className:'bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700'}, showAllTasks?'患者別表示':'本日のタスク一覧'),
        e('div', {className:'ml-auto flex items-center gap-2'},
          e('label', {className:'text-sm font-medium text-gray-700'}, '表示順:'),
          e('select', {value:sortBy, onChange:(ev)=>setSortBy(ev.target.value), className:'px-3 py-2 border border-gray-300 rounded-lg text-sm'},
            e('option', {value:'none'}, '登録順'),
            e('option', {value:'doctor'}, '主治医別'),
            e('option', {value:'room'}, '病室順'),
            e('option', {value:'weeks'}, '妊娠週数順')
          )
        )
      ),
      patients.length===0 && !isAdding && !editingId && e('div', {className:'bg-white rounded-lg shadow p-8 text-center text-gray-500'}, '登録されている患者はいません'),
      showAllTasks && !isAdding && !editingId && patients.length>0 && e('div', {className:'bg-white rounded-lg shadow-lg p-6'},
        e('h2', {className:'text-2xl font-bold text-gray-800 mb-4'}, '本日のタスク一覧'),
        getAllTasks().length===0 ? e('p', {className:'text-gray-500 text-center py-4'}, '本日のタスクはありません') :
        e('div', {className:'space-y-3'}, getAllTasks().map(task=>
          e('div', {key:`${task.patientId}-${task.id}`, className:`flex items-center gap-3 p-3 rounded-lg ${task.completed?'bg-gray-100':'bg-blue-50'}`},
            e('button', {onClick:()=>completeTask(task.patientId,task.id), className:'flex-shrink-0'},
              task.completed ? '✓' : '○'
            ),
            e('div', {className:'flex-1'},
              e('div', {className:`font-semibold ${task.completed?'text-gray-400 line-through':'text-indigo-700'}`}, task.patientName),
              e('div', {className:task.completed?'text-gray-400 line-through':'text-gray-700'}, task.text)
            )
          )
        ))
      ),
      !showAllTasks && !isAdding && !editingId && getSorted().map(patient=>
        e('div', {key:patient.id, className:'bg-white rounded-lg shadow-lg p-6 mb-4'},
          e('div', {className:'flex justify-between items-start mb-4'},
            e('div', {className:'flex-1'},
              e('div', {className:'flex items-center gap-3 mb-2 flex-wrap'},
                e('h3', {className:'text-2xl font-bold text-gray-800'}, patient.name),
                patient.roomNumber && e('span', {className:'px-3 py-1 bg-indigo-100 text-indigo-700 rounded-full text-sm font-semibold'}, `${patient.roomNumber}号室`),
                patient.doctor && e('span', {className:'px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-semibold'}, `主治医: ${patient.doctor}`)
              ),
              e('div', {className:'flex gap-6 text-sm flex-wrap'},
                e('div', null,
                  e('span', {className:'text-gray-600'}, '出産予定日: '),
                  e('span', {className:'font-semibold text-gray-800'}, new Date(patient.edd).toLocaleDateString('ja-JP',{year:'numeric',month:'long',day:'numeric'}))
                ),
                e('div', null,
                  e('span', {className:'text-gray-600'}, '妊娠週数: '),
                  e('span', {className:'font-bold text-indigo-600 text-lg'}, calcGA(patient.edd))
                ),
                patient.admissionDate && e('div', null,
                  e('span', {className:'text-gray-600'}, '入院日数: '),
                  e('span', {className:'font-semibold text-gray-800'}, (()=>{
                    const adm=new Date(patient.admissionDate); const today=new Date();
                    adm.setHours(0,0,0,0); today.setHours(0,0,0,0);
                    return `${Math.floor((today-adm)/(1000*60*60*24))+1}日目`;
                  })())
                ),
                patient.todayBP && e('div', null, e('span', {className:'text-gray-600'}, '本日BP: '), e('span', {className:'font-semibold text-gray-800'}, patient.todayBP)),
                patient.yesterdayBP && e('div', null, e('span', {className:'text-gray-600'}, '昨日BP: '), e('span', {className:'font-semibold text-gray-500'}, patient.yesterdayBP))
              )
            ),
            e('div', {className:'flex gap-2'},
              e('button', {onClick:()=>startEdit(patient), className:'p-2 text-blue-600 hover:bg-blue-50 rounded-lg', title:'編集'}, '✏'),
              e('button', {onClick:()=>deletePatient(patient.id), className:'p-2 text-red-600 hover:bg-red-50 rounded-lg', title:'削除'}, '🗑')
            )
          ),
          getCombinedProblems(patient).length>0 && e('div', {className:'bg-amber-50 border-l-4 border-amber-400 p-4 rounded mb-4'},
            e('h4', {className:'font-semibold text-gray-700 mb-2'}, 'プロブレム'),
            e('div', {className:'flex flex-wrap gap-2'}, getCombinedProblems(patient).map((p,i)=>
              e('span', {key:i, className:'bg-white px-3 py-1 rounded-full text-sm text-gray-700 border border-amber-200'}, p)
            ))
          ),
          patient.subjective?.trim() && e('div', {className:'bg-gray-50 border-l-4 border-gray-400 p-4 rounded mb-4'},
            e('h4', {className:'font-semibold text-gray-700 mb-1'}, 'S) 主観的情報'),
            e('p', {className:'text-sm text-gray-700 whitespace-pre-wrap'}, patient.subjective)
          ),
          patient.todaySchedule?.length>0 ? e('div', {className:'bg-blue-50 border-l-4 border-blue-400 p-4 rounded mb-4'},
            e('h4', {className:'font-semibold text-gray-700 mb-2'}, '本日の予定'),
            e('div', {className:'space-y-1'}, patient.todaySchedule.map(item=>
              e('div', {key:item.id, className:'flex items-center gap-2'},
                item.completed ? '✓' : '○',
                e('span', {className:`text-sm ${item.completed?'line-through text-gray-400':'text-gray-700'}`}, item.text)
              )
            ))
          ) : e('div', {className:'bg-blue-50 border-l-4 border-blue-400 p-4 rounded mb-4'},
            e('h4', {className:'font-semibold text-gray-700 mb-2'}, '本日の予定'),
            e('p', {className:'text-sm text-gray-500'}, 'なし')
          ),
          patient.tomorrowSchedule?.length>0 ? e('div', {className:'bg-green-50 border-l-4 border-green-400 p-4 rounded mb-4'},
            e('h4', {className:'font-semibold text-gray-700 mb-2'}, '明日の予定'),
            e('div', {className:'space-y-1'}, patient.tomorrowSchedule.map(item=>
              e('div', {key:item.id, className:'flex items-start gap-2 text-sm text-gray-700'},
                e('span', {className:'flex-shrink-0'}, '•'),
                e('span', {className:'flex-1'}, item.text)
              )
            ))
          ) : e('div', {className:'bg-green-50 border-l-4 border-green-400 p-4 rounded mb-4'},
            e('h4', {className:'font-semibold text-gray-700 mb-2'}, '明日の予定'),
            e('p', {className:'text-sm text-gray-500'}, 'なし')
          ),
          patient.futureScheduleItems?.length>0 && e('div', {className:'bg-purple-50 border-l-4 border-purple-400 p-4 rounded'},
            e('h4', {className:'font-semibold text-gray-700 mb-2'}, '今後の予定'),
            e('div', {className:'space-y-1'}, patient.futureScheduleItems.sort((a,b)=>{
              if(!a.date&&!b.date)return 0; if(!a.date)return 1; if(!b.date)return -1;
              return new Date(a.date)-new Date(b.date);
            }).map(item=>
              e('div', {key:item.id, className:'flex items-start gap-2 text-sm text-gray-700'},
                e('span', {className:'flex-shrink-0'}, '•'),
                e('div', {className:'flex-1'},
                  item.date && e('span', {className:'font-medium text-purple-700'}, new Date(item.date).toLocaleDateString('ja-JP',{month:'short',day:'numeric'})+' - '),
                  item.text
                )
              )
            ))
          )
        )
      )
    )
  );
};

ReactDOM.render(e(App), document.getElementById('root'));
