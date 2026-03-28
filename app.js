const { useState, useEffect } = React;

function App() {
  const [patients, setPatients] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [showCompleted, setShowCompleted] = useState(false);
  const [sortBy, setSortBy] = useState('registration');
  const [formData, setFormData] = useState({
    id: '',
    name: '',
    room: '',
    doctor: '',
    dueDate: '',
    admissionDate: '',
    bpToday: '',
    bpYesterday: '',
    problems: [],
    otherProblem: '',
    subjective: '',
    todayTasks: [],
    tomorrowTasks: [],
    futureTasks: []
  });

  const problemOptions = [
    '切迫早産', '妊娠高血圧症候群', '妊娠糖尿病', '前置胎盤',
    '常位胎盤早期剥離', '多胎妊娠', '胎児発育不全', 'IUGR',
    '羊水過多/過少', '前期破水', '遷延分娩', '帝王切開術後'
  ];

  const quickButtons = [
    'NST', '採血', '超音波検査', '内診', '帝王切開', '分娩誘発'
  ];

  useEffect(() => {
    const stored = localStorage.getItem('obstetricRounds');
    if (stored) {
      setPatients(JSON.parse(stored));
    }
    
    const checkDate = () => {
      const now = new Date();
      const lastCheck = localStorage.getItem('lastDateCheck');
      const today = now.toDateString();
      
      if (lastCheck !== today) {
        updateSchedules();
        localStorage.setItem('lastDateCheck', today);
      }
    };
    
    checkDate();
    const interval = setInterval(checkDate, 60000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    localStorage.setItem('obstetricRounds', JSON.stringify(patients));
  }, [patients]);

  const updateSchedules = () => {
    const now = new Date();
    const today = now.toISOString().split('T')[0];
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split('T')[0];

    setPatients(prevPatients => prevPatients.map(patient => {
      const incompleteTodayTasks = patient.todayTasks.filter(task => !task.completed);
      const updatedTomorrowTasks = [...patient.tomorrowTasks, ...incompleteTodayTasks];
      
      const tasksFromFuture = patient.futureTasks.filter(task => 
        task.date && task.date <= today
      );
      
      const remainingFutureTasks = patient.futureTasks.filter(task => 
        !task.date || task.date > today
      );

      const newTodayTasks = [...tasksFromFuture];

      return {
        ...patient,
        bpYesterday: patient.bpToday,
        bpToday: '',
        subjective: '',
        todayTasks: newTodayTasks,
        tomorrowTasks: updatedTomorrowTasks,
        futureTasks: remainingFutureTasks
      };
    }));
  };

  const calculateGestationalAge = (dueDate) => {
    if (!dueDate) return null;
    
    const due = new Date(dueDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    due.setHours(0, 0, 0, 0);
    
    // 出産予定日は妊娠40週0日なので、280日を引いて最終月経日を計算
    const lmp = new Date(due);
    lmp.setDate(lmp.getDate() - 280);
    
    // 最終月経日から今日までの日数を計算
    const diffTime = today - lmp;
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    
    const weeks = Math.floor(diffDays / 7);
    const days = diffDays % 7;
    
    return { weeks, days, totalDays: diffDays };
  };

  const calculateAdmissionDays = (admissionDate) => {
    if (!admissionDate) return null;
    
    const admission = new Date(admissionDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    admission.setHours(0, 0, 0, 0);
    
    const diffTime = today - admission;
    const days = Math.floor(diffTime / (1000 * 60 * 60 * 24)) + 1;
    
    return days;
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleProblemToggle = (problem) => {
    setFormData(prev => ({
      ...prev,
      problems: prev.problems.includes(problem)
        ? prev.problems.filter(p => p !== problem)
        : [...prev.problems, problem]
    }));
  };

  const addTask = (type, taskText = '') => {
    const newTask = {
      id: Date.now(),
      text: taskText,
      time: '',
      completed: false
    };
    
    if (type === 'future') {
      newTask.date = '';
    }
    
    setFormData(prev => ({
      ...prev,
      [`${type}Tasks`]: [...prev[`${type}Tasks`], newTask]
    }));
  };

  const updateTask = (type, taskId, field, value) => {
    setFormData(prev => ({
      ...prev,
      [`${type}Tasks`]: prev[`${type}Tasks`].map(task =>
        task.id === taskId ? { ...task, [field]: value } : task
      )
    }));
  };

  const removeTask = (type, taskId) => {
    setFormData(prev => ({
      ...prev,
      [`${type}Tasks`]: prev[`${type}Tasks`].filter(task => task.id !== taskId)
    }));
  };

  const handleSubmit = () => {
    if (!formData.name.trim()) {
      alert('患者氏名を入力してください');
      return;
    }

    const sortedFutureTasks = [...formData.futureTasks].sort((a, b) => {
      if (!a.date && !b.date) return 0;
      if (!a.date) return 1;
      if (!b.date) return -1;
      
      if (a.date !== b.date) {
        return a.date.localeCompare(b.date);
      }
      
      if (!a.time && !b.time) return 0;
      if (!a.time) return 1;
      if (!b.time) return -1;
      return a.time.localeCompare(b.time);
    });

    if (editingId) {
      setPatients(prev => prev.map(p =>
        p.id === editingId ? { 
          ...formData, 
          id: editingId,
          futureTasks: sortedFutureTasks 
        } : p
      ));
      setEditingId(null);
    } else {
      setPatients(prev => [...prev, { 
        ...formData, 
        id: Date.now(),
        futureTasks: sortedFutureTasks 
      }]);
    }
    resetForm();
  };

  const handleEdit = (patient) => {
    setFormData(patient);
    setEditingId(patient.id);
  };

  const handleDelete = (id) => {
    if (window.confirm('この患者を削除しますか?')) {
      setPatients(prev => prev.filter(p => p.id !== id));
    }
  };

  const resetForm = () => {
    setFormData({
      id: '',
      name: '',
      room: '',
      doctor: '',
      dueDate: '',
      admissionDate: '',
      bpToday: '',
      bpYesterday: '',
      problems: [],
      otherProblem: '',
      subjective: '',
      todayTasks: [],
      tomorrowTasks: [],
      futureTasks: []
    });
    setEditingId(null);
  };

  const getAllTodayTasks = () => {
    return patients.flatMap(patient => 
      patient.todayTasks.map(task => ({
        ...task,
        patientName: patient.name,
        patientId: patient.id
      }))
    );
  };

  const sortPatients = (patientsToSort) => {
    const sorted = [...patientsToSort];
    
    switch(sortBy) {
      case 'doctor':
        return sorted.sort((a, b) => (a.doctor || '').localeCompare(b.doctor || ''));
      case 'room':
        return sorted.sort((a, b) => (a.room || '').localeCompare(b.room || ''));
      case 'gestationalAge':
        return sorted.sort((a, b) => {
          const ageA = calculateGestationalAge(a.dueDate);
          const ageB = calculateGestationalAge(b.dueDate);
          if (!ageA && !ageB) return 0;
          if (!ageA) return 1;
          if (!ageB) return -1;
          return ageB.totalDays - ageA.totalDays;
        });
      default:
        return sorted;
    }
  };

  const todayTasks = getAllTodayTasks();
  const displayedTasks = showCompleted 
    ? todayTasks 
    : todayTasks.filter(task => !task.completed);

  const toggleTaskCompletion = (patientId, taskId) => {
    setPatients(prev => prev.map(patient => {
      if (patient.id === patientId) {
        return {
          ...patient,
          todayTasks: patient.todayTasks.map(task =>
            task.id === taskId ? { ...task, completed: !task.completed } : task
          )
        };
      }
      return patient;
    }));
  };

  return React.createElement('div', { className: 'min-h-screen bg-gray-50 pb-32' },
    React.createElement('div', { className: 'max-w-4xl mx-auto p-4' },
      React.createElement('div', { className: 'flex items-center justify-between mb-6' },
        React.createElement('h1', { className: 'text-2xl font-bold text-gray-800' }, '産科回診管理'),
        React.createElement('button', {
          onClick: updateSchedules,
          className: 'px-3 py-1 bg-blue-500 text-white text-sm rounded hover:bg-blue-600'
        }, '更新')
      ),

      React.createElement('div', { className: 'bg-white rounded-lg shadow-md p-6 mb-6' },
        React.createElement('h2', { className: 'text-lg font-semibold mb-4' }, '本日のタスク'),
        
        React.createElement('div', { className: 'flex gap-2 mb-4' },
          React.createElement('button', {
            onClick: () => setShowCompleted(!showCompleted),
            className: `px-3 py-1 text-sm rounded ${showCompleted ? 'bg-gray-200' : 'bg-blue-500 text-white'}`
          }, showCompleted ? '完了を非表示' : '完了を表示')
        ),

        displayedTasks.length === 0 
          ? React.createElement('p', { className: 'text-gray-500 text-sm' }, '本日のタスクはありません')
          : React.createElement('div', { className: 'space-y-2' },
              displayedTasks.map(task =>
                React.createElement('div', {
                  key: `${task.patientId}-${task.id}`,
                  className: 'flex items-center gap-2 p-2 bg-gray-50 rounded'
                },
                  React.createElement('input', {
                    type: 'checkbox',
                    checked: task.completed,
                    onChange: () => toggleTaskCompletion(task.patientId, task.id),
                    className: 'w-4 h-4'
                  }),
                  React.createElement('span', { 
                    className: `flex-1 text-sm ${task.completed ? 'line-through text-gray-400' : ''}`
                  }, `${task.patientName}: ${task.time ? task.time + ' - ' : ''}${task.text}`)
                )
              )
            )
      ),

      React.createElement('div', { className: 'bg-white rounded-lg shadow-md p-6 mb-6' },
        React.createElement('h2', { className: 'text-lg font-semibold mb-4' }, '患者一覧'),
        
        React.createElement('div', { className: 'flex gap-2 mb-4 flex-wrap' },
          React.createElement('button', {
            onClick: () => setSortBy('registration'),
            className: `px-3 py-1 text-sm rounded ${sortBy === 'registration' ? 'bg-blue-500 text-white' : 'bg-gray-200'}`
          }, '登録順'),
          React.createElement('button', {
            onClick: () => setSortBy('doctor'),
            className: `px-3 py-1 text-sm rounded ${sortBy === 'doctor' ? 'bg-blue-500 text-white' : 'bg-gray-200'}`
          }, '主治医別'),
          React.createElement('button', {
            onClick: () => setSortBy('room'),
            className: `px-3 py-1 text-sm rounded ${sortBy === 'room' ? 'bg-blue-500 text-white' : 'bg-gray-200'}`
          }, '病室順'),
          React.createElement('button', {
            onClick: () => setSortBy('gestationalAge'),
            className: `px-3 py-1 text-sm rounded ${sortBy === 'gestationalAge' ? 'bg-blue-500 text-white' : 'bg-gray-200'}`
          }, '妊娠週数順')
        ),

        sortPatients(patients).map(patient => {
          const ga = calculateGestationalAge(patient.dueDate);
          const admDays = calculateAdmissionDays(patient.admissionDate);
          
          return React.createElement('div', {
            key: patient.id,
            className: 'border-b border-gray-200 py-4 last:border-b-0'
          },
            React.createElement('div', { className: 'flex justify-between items-start mb-2' },
              React.createElement('div', { className: 'flex-1' },
                React.createElement('h3', { className: 'font-semibold text-lg' }, patient.name),
                React.createElement('div', { className: 'text-sm text-gray-600 space-y-1 mt-1' },
                  patient.id && React.createElement('div', null, `ID: ${patient.id}`),
                  patient.room && React.createElement('div', null, `病室: ${patient.room}`),
                  patient.doctor && React.createElement('div', null, `主治医: ${patient.doctor}`),
                  patient.dueDate && React.createElement('div', null, 
                    `出産予定日: ${new Date(patient.dueDate).toLocaleDateString('ja-JP', { year: 'numeric', month: 'numeric', day: 'numeric' })}`
                  ),
                  ga && React.createElement('div', null, `妊娠週数: ${ga.weeks}週${ga.days}日`),
                  admDays && React.createElement('div', null, `入院日数: ${admDays}日目`)
                )
              ),
              React.createElement('div', { className: 'flex gap-2' },
                React.createElement('button', {
                  onClick: () => handleEdit(patient),
                  className: 'px-3 py-1 bg-blue-500 text-white text-sm rounded hover:bg-blue-600'
                }, '編集'),
                React.createElement('button', {
                  onClick: () => handleDelete(patient.id),
                  className: 'px-3 py-1 bg-red-500 text-white text-sm rounded hover:bg-red-600'
                }, '削除')
              )
            ),

            patient.problems.length > 0 && React.createElement('div', { className: 'mb-2' },
              React.createElement('div', { className: 'text-sm font-semibold text-gray-700' }, 'プロブレム:'),
              React.createElement('div', { className: 'text-sm text-gray-600' }, patient.problems.join(', ')),
              patient.otherProblem && React.createElement('div', { className: 'text-sm text-gray-600' }, patient.otherProblem)
            ),

            patient.subjective && React.createElement('div', { className: 'mb-2' },
              React.createElement('div', { className: 'text-sm font-semibold text-gray-700' }, 'S) 主観的情報:'),
              React.createElement('div', { className: 'text-sm text-gray-600 whitespace-pre-wrap' }, patient.subjective)
            ),

            (patient.bpToday || patient.bpYesterday) && React.createElement('div', { className: 'mb-2' },
              React.createElement('div', { className: 'text-sm font-semibold text-gray-700' }, '血圧:'),
              React.createElement('div', { className: 'text-sm text-gray-600' },
                patient.bpToday && `本日: ${patient.bpToday}`,
                patient.bpToday && patient.bpYesterday && ' / ',
                patient.bpYesterday && `昨日: ${patient.bpYesterday}`
              )
            ),

            patient.todayTasks.length > 0 && React.createElement('div', { className: 'mb-2' },
              React.createElement('div', { className: 'text-sm font-semibold text-gray-700' }, '本日の予定:'),
              React.createElement('div', { className: 'text-sm text-gray-600' },
                patient.todayTasks.map(task =>
                  React.createElement('div', { key: task.id, className: task.completed ? 'line-through' : '' },
                    `• ${task.time ? task.time + ' - ' : ''}${task.text}`
                  )
                )
              )
            ),

            patient.tomorrowTasks.length > 0 && React.createElement('div', { className: 'mb-2' },
              React.createElement('div', { className: 'text-sm font-semibold text-gray-700' }, '明日の予定:'),
              React.createElement('div', { className: 'text-sm text-gray-600' },
                patient.tomorrowTasks.map(task =>
                  React.createElement('div', { key: task.id },
                    `• ${task.time ? task.time + ' - ' : ''}${task.text}`
                  )
                )
              )
            ),

            patient.futureTasks.length > 0 && React.createElement('div', null,
              React.createElement('div', { className: 'text-sm font-semibold text-gray-700' }, '今後の予定:'),
              React.createElement('div', { className: 'text-sm text-gray-600' },
                patient.futureTasks.map(task => {
                  const taskGa = task.date && patient.dueDate ? calculateGestationalAge(patient.dueDate) : null;
                  let displayGa = '';
                  
                  if (task.date && taskGa && patient.dueDate) {
                    const taskDate = new Date(task.date);
                    const dueDate = new Date(patient.dueDate);
                    taskDate.setHours(0, 0, 0, 0);
                    dueDate.setHours(0, 0, 0, 0);
                    
                    const lmp = new Date(dueDate);
                    lmp.setDate(lmp.getDate() - 280);
                    
                    const diffTime = taskDate - lmp;
                    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
                    
                    const weeks = Math.floor(diffDays / 7);
                    const days = diffDays % 7;
                    displayGa = ` (${weeks}週${days}日)`;
                  }
                  
                  return React.createElement('div', { key: task.id },
                    task.date
                      ? `${new Date(task.date).toLocaleDateString('ja-JP', { month: 'numeric', day: 'numeric' })}${displayGa}${task.time ? ' ' + task.time : ''} - ${task.text}`
                      : `• ${task.time ? task.time + ' - ' : ''}${task.text}`
                  );
                })
              )
            )
          );
        })
      ),

      React.createElement('div', { className: 'bg-white rounded-lg shadow-md p-6' },
        React.createElement('h2', { className: 'text-lg font-semibold mb-4' },
          editingId ? '患者情報編集' : '新規患者登録'
        ),

        React.createElement('div', { className: 'space-y-4' },
          React.createElement('div', null,
            React.createElement('label', { className: 'block text-sm font-medium mb-1' }, '患者ID'),
            React.createElement('input', {
              type: 'text',
              value: formData.id,
              onChange: (e) => handleInputChange('id', e.target.value),
              className: 'w-full px-3 py-2 border rounded-md'
            })
          ),

          React.createElement('div', null,
            React.createElement('label', { className: 'block text-sm font-medium mb-1' }, '氏名 *'),
            React.createElement('input', {
              type: 'text',
              value: formData.name,
              onChange: (e) => handleInputChange('name', e.target.value),
              className: 'w-full px-3 py-2 border rounded-md'
            })
          ),

          React.createElement('div', null,
            React.createElement('label', { className: 'block text-sm font-medium mb-1' }, '病室'),
            React.createElement('input', {
              type: 'text',
              value: formData.room,
              onChange: (e) => handleInputChange('room', e.target.value),
              className: 'w-full px-3 py-2 border rounded-md'
            })
          ),

          React.createElement('div', null,
            React.createElement('label', { className: 'block text-sm font-medium mb-1' }, '主治医'),
            React.createElement('input', {
              type: 'text',
              value: formData.doctor,
              onChange: (e) => handleInputChange('doctor', e.target.value),
              className: 'w-full px-3 py-2 border rounded-md'
            })
          ),

          React.createElement('div', null,
            React.createElement('label', { className: 'block text-sm font-medium mb-1' }, '出産予定日'),
            React.createElement('input', {
              type: 'date',
              value: formData.dueDate,
              onChange: (e) => handleInputChange('dueDate', e.target.value),
              className: 'w-full px-1 py-2 border rounded-md text-xs'
            })
          ),

          React.createElement('div', null,
            React.createElement('label', { className: 'block text-sm font-medium mb-1' }, '入院日'),
            React.createElement('input', {
              type: 'date',
              value: formData.admissionDate,
              onChange: (e) => handleInputChange('admissionDate', e.target.value),
              className: 'w-full px-1 py-2 border rounded-md text-xs'
            })
          ),

          React.createElement('div', null,
            React.createElement('label', { className: 'block text-sm font-medium mb-1' }, '本日の血圧'),
            React.createElement('input', {
              type: 'text',
              value: formData.bpToday,
              onChange: (e) => handleInputChange('bpToday', e.target.value),
              placeholder: '120/80',
              className: 'w-full px-3 py-2 border rounded-md'
            })
          ),

          React.createElement('div', null,
            React.createElement('label', { className: 'block text-sm font-medium mb-1' }, '昨日の血圧'),
            React.createElement('input', {
              type: 'text',
              value: formData.bpYesterday,
              onChange: (e) => handleInputChange('bpYesterday', e.target.value),
              placeholder: '120/80',
              className: 'w-full px-3 py-2 border rounded-md'
            })
          ),

          React.createElement('div', null,
            React.createElement('label', { className: 'block text-sm font-medium mb-2' }, 'プロブレム'),
            React.createElement('div', { className: 'grid grid-cols-2 gap-2 mb-2' },
              problemOptions.map(problem =>
                React.createElement('label', {
                  key: problem,
                  className: 'flex items-center space-x-2 text-sm'
                },
                  React.createElement('input', {
                    type: 'checkbox',
                    checked: formData.problems.includes(problem),
                    onChange: () => handleProblemToggle(problem),
                    className: 'rounded'
                  }),
                  React.createElement('span', null, problem)
                )
              )
            ),
            React.createElement('input', {
              type: 'text',
              value: formData.otherProblem,
              onChange: (e) => handleInputChange('otherProblem', e.target.value),
              placeholder: 'その他のプロブレム',
              className: 'w-full px-3 py-2 border rounded-md'
            })
          ),

          React.createElement('div', null,
            React.createElement('label', { className: 'block text-sm font-medium mb-1' }, 'S) 主観的情報'),
            React.createElement('div', { className: 'flex gap-2 mb-2' },
              React.createElement('button', {
                onClick: () => handleInputChange('subjective', '特になし'),
                className: 'px-3 py-1 bg-gray-200 text-sm rounded hover:bg-gray-300'
              }, '特になし')
            ),
            React.createElement('textarea', {
              value: formData.subjective,
              onChange: (e) => handleInputChange('subjective', e.target.value),
              rows: 3,
              className: 'w-full px-3 py-2 border rounded-md'
            })
          ),

          React.createElement('div', null,
            React.createElement('label', { className: 'block text-sm font-medium mb-2' }, '本日の予定'),
            React.createElement('div', { className: 'flex gap-2 mb-2 flex-wrap' },
              quickButtons.map(btn =>
                React.createElement('button', {
                  key: btn,
                  onClick: () => addTask('today', btn),
                  className: 'px-3 py-1 bg-green-100 text-sm rounded hover:bg-green-200'
                }, btn)
              ),
              React.createElement('button', {
                onClick: () => addTask('today'),
                className: 'px-3 py-1 bg-blue-500 text-white text-sm rounded hover:bg-blue-600'
              }, '+ 追加')
            ),
            React.createElement('div', { className: 'space-y-2' },
              formData.todayTasks.map(task =>
                React.createElement('div', {
                  key: task.id,
                  className: 'flex gap-2 items-center'
                },
                  React.createElement('input', {
                    type: 'time',
                    value: task.time,
                    onChange: (e) => updateTask('today', task.id, 'time', e.target.value),
                    className: 'px-2 py-1 border rounded text-sm'
                  }),
                  React.createElement('input', {
                    type: 'text',
                    value: task.text,
                    onChange: (e) => updateTask('today', task.id, 'text', e.target.value),
                    className: 'flex-1 px-2 py-1 border rounded text-sm'
                  }),
                  React.createElement('button', {
                    onClick: () => removeTask('today', task.id),
                    className: 'px-2 py-1 bg-red-500 text-white text-sm rounded hover:bg-red-600'
                  }, '削除')
                )
              )
            )
          ),

          React.createElement('div', null,
            React.createElement('label', { className: 'block text-sm font-medium mb-2' }, '明日の予定'),
            React.createElement('div', { className: 'flex gap-2 mb-2 flex-wrap' },
              quickButtons.map(btn =>
                React.createElement('button', {
                  key: btn,
                  onClick: () => addTask('tomorrow', btn),
                  className: 'px-3 py-1 bg-green-100 text-sm rounded hover:bg-green-200'
                }, btn)
              ),
              React.createElement('button', {
                onClick: () => addTask('tomorrow'),
                className: 'px-3 py-1 bg-blue-500 text-white text-sm rounded hover:bg-blue-600'
              }, '+ 追加')
            ),
            React.createElement('div', { className: 'space-y-2' },
              formData.tomorrowTasks.map(task =>
                React.createElement('div', {
                  key: task.id,
                  className: 'flex gap-2 items-center'
                },
                  React.createElement('input', {
                    type: 'time',
                    value: task.time,
                    onChange: (e) => updateTask('tomorrow', task.id, 'time', e.target.value),
                    className: 'px-2 py-1 border rounded text-sm'
                  }),
                  React.createElement('input', {
                    type: 'text',
                    value: task.text,
                    onChange: (e) => updateTask('tomorrow', task.id, 'text', e.target.value),
                    className: 'flex-1 px-2 py-1 border rounded text-sm'
                  }),
                  React.createElement('button', {
                    onClick: () => removeTask('tomorrow', task.id),
                    className: 'px-2 py-1 bg-red-500 text-white text-sm rounded hover:bg-red-600'
                  }, '削除')
                )
              )
            )
          ),

          React.createElement('div', null,
            React.createElement('label', { className: 'block text-sm font-medium mb-2' }, '今後の予定'),
            React.createElement('div', { className: 'flex gap-2 mb-2 flex-wrap' },
              quickButtons.map(btn =>
                React.createElement('button', {
                  key: btn,
                  onClick: () => addTask('future', btn),
                  className: 'px-3 py-1 bg-green-100 text-sm rounded hover:bg-green-200'
                }, btn)
              ),
              React.createElement('button', {
                onClick: () => addTask('future'),
                className: 'px-3 py-1 bg-blue-500 text-white text-sm rounded hover:bg-blue-600'
              }, '+ 追加')
            ),
            React.createElement('div', { className: 'space-y-2' },
              formData.futureTasks.map(task =>
                React.createElement('div', {
                  key: task.id,
                  className: 'flex gap-2 items-center'
                },
                  React.createElement('input', {
                    type: 'date',
                    value: task.date,
                    onChange: (e) => updateTask('future', task.id, 'date', e.target.value),
                    className: 'px-2 py-1 border rounded text-sm'
                  }),
                  React.createElement('input', {
                    type: 'time',
                    value: task.time,
                    onChange: (e) => updateTask('future', task.id, 'time', e.target.value),
                    className: 'px-2 py-1 border rounded text-sm'
                  }),
                  React.createElement('input', {
                    type: 'text',
                    value: task.text,
                    onChange: (e) => updateTask('future', task.id, 'text', e.target.value),
                    className: 'flex-1 px-2 py-1 border rounded text-sm',
                    placeholder: task.date && formData.dueDate ? (() => {
                      const taskDate = new Date(task.date);
                      const dueDate = new Date(formData.dueDate);
                      taskDate.setHours(0, 0, 0, 0);
                      dueDate.setHours(0, 0, 0, 0);
                      
                      const lmp = new Date(dueDate);
                      lmp.setDate(lmp.getDate() - 280);
                      
                      const diffTime = taskDate - lmp;
                      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
                      
                      const weeks = Math.floor(diffDays / 7);
                      const days = diffDays % 7;
                      return `${weeks}週${days}日`;
                    })() : ''
                  }),
                  React.createElement('button', {
                    onClick: () => removeTask('future', task.id),
                    className: 'px-2 py-1 bg-red-500 text-white text-sm rounded hover:bg-red-600'
                  }, '削除')
                )
              )
            )
          )
        )
      )
    ),

    React.createElement('div', { className: 'fixed bottom-0 left-0 right-0 bg-white border-t shadow-lg p-4' },
      React.createElement('div', { className: 'max-w-4xl mx-auto flex gap-2' },
        React.createElement('button', {
          onClick: handleSubmit,
          className: 'flex-1 px-6 py-3 bg-blue-500 text-white font-semibold rounded-lg hover:bg-blue-600'
        }, editingId ? '更新' : '登録'),
        editingId && React.createElement('button', {
          onClick: resetForm,
          className: 'px-6 py-3 bg-gray-300 text-gray-700 font-semibold rounded-lg hover:bg-gray-400'
        }, 'キャンセル')
      )
    )
  );
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(React.createElement(App));
