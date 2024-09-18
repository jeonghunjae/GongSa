const express = require('express');
const { Sequelize, DataTypes, Op } = require('sequelize');
const path = require('path');
const fs = require('fs'); // fs 모듈을 불러옵니다.
const app = express();

// 날씨
const axios = require('axios');
const querystring = require('querystring');



// 뷰 엔진 및 정적 파일 설정
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// SQLite 데이터베이스 설정
const sequelize = new Sequelize({
  dialect: 'sqlite',
  storage: path.join(__dirname, 'database.sqlite'),
});

// 모델 정의

// Companies 모델
const Companies = sequelize.define('companies', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  company: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  trade: {
    type: DataTypes.STRING,
    allowNull: false,
  },
});

// Materials 모델
const Materials = sequelize.define('materials', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  materialName: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  specification: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  unit: {
    type: DataTypes.STRING,
    allowNull: false,
  },
});

// DailyMaterials 모델 정의
const DailyMaterials = sequelize.define('daily_materials', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  date: {
    type: DataTypes.DATEONLY,
    allowNull: false,
  },
  materialId: {
    type: DataTypes.INTEGER,
    references: {
      model: Materials,
      key: 'id',
    },
    allowNull: false,
  },
  quantity: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
});

// Equipments 모델
const Equipments = sequelize.define('equipments', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  equipmentName: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  specification: {
    type: DataTypes.STRING,
    allowNull: true,
  },
});

// WorkDetails 모델 (여기서 한 번만 선언)
const WorkDetails = sequelize.define('work_details', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  date: {
    type: DataTypes.DATEONLY,
    allowNull: false,
  },
  companyId: {
    type: DataTypes.INTEGER,
    references: {
      model: Companies,
      key: 'id',
    },
    allowNull: false,
  },
  personnel_count: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: false,
  },
});

// WorkEquipments 모델 (새로 추가)
const WorkEquipments = sequelize.define('work_equipments', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  workDetailId: {
    type: DataTypes.INTEGER,
    references: {
      model: WorkDetails,
      key: 'id',
    },
    allowNull: false,
  },
  equipmentId: {
    type: DataTypes.INTEGER,
    references: {
      model: Equipments,
      key: 'id',
    },
    allowNull: false,
  },
  equipmentCount: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
});

// Weather 모델 정의
const Weather = sequelize.define('weather', {
  date: {
    type: DataTypes.DATEONLY,
    primaryKey: true,
  },
  minTemp: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  maxTemp: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  weatherCondition: {
    type: DataTypes.STRING,
    allowNull: false,
  },
});

// Site 모델 정의
const Site = sequelize.define('site', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  siteName: {
    type: DataTypes.STRING,
    allowNull: false,
  },
});


// 관계 정의
WorkDetails.belongsTo(Companies, { foreignKey: 'companyId', as: 'companyDetails' });
DailyMaterials.belongsTo(Materials, { foreignKey: 'materialId', as: 'materialDetails' });

// WorkDetails와 Equipments 간 다대다 관계 설정
WorkDetails.belongsToMany(Equipments, { through: WorkEquipments, foreignKey: 'workDetailId', as: 'usedEquipments' });
Equipments.belongsToMany(WorkDetails, { through: WorkEquipments, foreignKey: 'equipmentId', as: 'workDetails' });
WorkEquipments.belongsTo(Equipments, { foreignKey: 'equipmentId', as: 'equipment' }); 

// WorkEquipments와 WorkDetails 간의 관계 정의 (이미 정의되었는지 확인)
WorkEquipments.belongsTo(WorkDetails, { foreignKey: 'workDetailId', as: 'workDetail' });

// Companies has many WorkDetails
Companies.hasMany(WorkDetails, {
  foreignKey: 'companyId',
  as: 'workDetails'
});

// 데이터베이스 초기화
(async () => {
  await sequelize.sync(); // 데이터베이스와 모델을 동기화
  console.log('All tables have been synchronized!');
})();

// 라우트 설정

// 업체 추가 페이지 라우트
app.get('/create-company', async (req, res) => {
  const companiesList = await Companies.findAll({ order: [['company', 'ASC']] });
  res.render('create-company', { companies: companiesList });
});

// 업체명 추가 처리
app.post('/create-company', async (req, res) => {
  const { company, trade } = req.body;

  await Companies.create({ company, trade });
  res.redirect('/create-company');
});

// 업체명 수정 처리
app.post('/update-company/:id', async (req, res) => {
  const { id } = req.params;
  const { company, trade } = req.body;

  await Companies.update({ company, trade }, { where: { id } });
  res.redirect('/create-company');
});

// 업체명 삭제 처리
app.post('/delete-company/:id', async (req, res) => {
  const { id } = req.params;
  await Companies.destroy({ where: { id } });
  res.redirect('/create-company');
});

// 입력 페이지 라우트
app.get('/', async (req, res) => { 
  // 오늘의 날짜를 가져옵니다.
  const today = new Date().toISOString().split('T')[0];

  // 오늘의 날씨 데이터가 있는지 확인합니다.
  const weatherExists = await Weather.findOne({ where: { date: today } });

  if (!weatherExists) {
    // 날씨 데이터가 없으면 API를 호출하여 데이터를 가져옵니다.
    await getWeatherData();
  }

  const companiesList = await Companies.findAll({ order: [['company', 'ASC']] });
  const equipmentsList = await Equipments.findAll({ order: [['equipmentName', 'ASC']] });
  res.render('input', { companies: companiesList, equipments: equipmentsList });
});

// 공사일보 데이터 처리 라우트
app.post('/create', async (req, res) => {
  try {
    const { date, companyIds, equipmentNames, equipmentSpecifications, equipmentCounts } = req.body;

    if (!companyIds) {
      return res.status(400).send('최소 한 개의 업체를 선택해야 합니다.');
    }

    // companyIds가 단일 값일 경우 배열로 변환
    const companyIdArray = Array.isArray(companyIds) ? companyIds : [companyIds];

    // WorkDetails 생성
    for (let companyId of companyIdArray) {
      const personnel_count = req.body[`personnel_count_${companyId}`];
      const description = req.body[`description_${companyId}`];

      // 필수 입력 필드 검증
      if (!personnel_count || !description) {
        continue; // 해당 업체의 필수 입력값이 없으면 넘어감
      }

      // 새로운 작업 세부 사항 추가
      const workDetail = await WorkDetails.create({
        date,
        companyId,
        personnel_count,
        description,
      });

      // 장비 연결: 장비명이 있고, 그에 따른 규격과 수량이 입력된 경우에만 연결
      if (equipmentNames && equipmentSpecifications && equipmentCounts) {
        for (let i = 0; i < equipmentNames.length; i++) {
          const equipmentName = equipmentNames[i];
          const specification = equipmentSpecifications[i];
          const equipmentCount = equipmentCounts[i];

          // 장비명을 기준으로 해당 장비의 ID를 찾음
          const equipment = await Equipments.findOne({
            where: {
              equipmentName: equipmentName,
              specification: specification
            }
          });

          // 해당 장비가 있을 경우에만 WorkEquipments에 추가
          if (equipment) {
            await WorkEquipments.create({
              workDetailId: workDetail.id,
              equipmentId: equipment.id,
              equipmentCount: equipmentCount,
            });
          }
        }
      }
    }

    res.redirect('/success'); // 성공 페이지로 리디렉션
  } catch (error) {
    console.error('Error creating work details:', error);
    res.status(500).send('작업 세부 사항을 추가하는 중 오류가 발생했습니다.');
  }
});

// 성공 페이지 라우트
app.get('/success', (req, res) => {
  res.render('success');
});

// 관리 페이지 라우트
app.get('/manage', async (req, res) => {
  const { date, company } = req.query;

  // 모든 업체 리스트 가져오기
  const companiesList = await Companies.findAll({ order: [['company', 'ASC']] });

  // 모든 현장명 리스트 가져오기
  let sites = [];
  try {
    sites = await Site.findAll({ order: [['siteName', 'ASC']] });
  } catch (error) {
    console.error('Error fetching sites:', error);
    // 필요하다면 에러 처리를 추가하세요.
  }

  // 조건 설정
  const whereClause = {};
  if (date) {
    whereClause.date = date;
  }
  if (company) {
    whereClause.companyId = company;
  }

  // 작성된 공사일보 정보와 해당 업체 정보 JOIN
  const writtenCompanies = await WorkDetails.findAll({
    where: whereClause,
    include: [
      { model: Companies, as: 'companyDetails' },
      {
        model: Equipments,
        as: 'usedEquipments',
        through: { attributes: ['equipmentCount'] }, // 중간 테이블의 equipmentCount 가져오기
      },
    ],
    order: [['companyId', 'ASC']],
  });

  // 작성된 업체 ID 목록 추출
  const writtenCompanyIds = writtenCompanies.map((work) => work.companyId);

  // 작성되지 않은 업체 목록 구하기
  const notWrittenCompanies = await Companies.findAll({
    where: {
      id: { [Op.notIn]: writtenCompanyIds },
    },
    order: [['company', 'ASC']],
  });

  res.render('manage', {
    companies: companiesList,
    writtenCompanies,
    notWrittenCompanies,
    sites, // 추가: 현장명 리스트를 템플릿에 전달
  });
});

// 데이터베이스 초기화 라우트
app.get('/reset-database', async (req, res) => {
  try {
    // work_details 테이블만 삭제하고 다시 생성
    await WorkDetails.sync({ force: true });

    console.log('work_details table has been reset and recreated!');
    res.redirect('/manage');
  } catch (error) {
    console.error('Error resetting the work_details table:', error);
    res.status(500).send('work_details 테이블 초기화 중 오류가 발생했습니다.');
  }
});

// 수정 처리 라우트 (AJAX 요청 처리)
app.post('/update-work/:id', async (req, res) => {
  const { id } = req.params;
  const { personnel_count, description } = req.body;

  try {
    // 작업 세부사항 업데이트
    await WorkDetails.update({ personnel_count, description }, { where: { id } });

    res.status(200).json({ message: '수정 완료' });
  } catch (error) {
    console.error('Error updating work details:', error);
    res.status(500).json({ message: '수정 중 오류 발생' });
  }
});

// 삭제 처리 라우트 (AJAX 요청 처리)
app.post('/delete-work/:id', async (req, res) => {
  const { id } = req.params;

  try {
    // 작업 세부사항 삭제
    await WorkDetails.destroy({ where: { id } });

    res.status(200).json({ message: '삭제 완료' });
  } catch (error) {
    console.error('Error deleting work details:', error);
    res.status(500).json({ message: '삭제 중 오류 발생' });
  }
});



// 자재 관리 페이지 라우트
app.get('/manage-materials', async (req, res) => {
  const materialsList = await Materials.findAll({ order: [['materialName', 'ASC']] });
  res.render('materials', { materials: materialsList });
});

// 자재 추가 처리
app.post('/add-material', async (req, res) => {
  const { materialName, specification, unit } = req.body;

  await Materials.create({ materialName, specification, unit });
  res.redirect('/manage-materials');
});

// 자재 수정 페이지 라우트
app.get('/update-material/:id', async (req, res) => {
  const { id } = req.params;
  const material = await Materials.findByPk(id);
  res.render('update-material', { material });
});

// 자재 수정 처리
app.post('/update-material/:id', async (req, res) => {
  const { id } = req.params;
  const { materialName, specification, unit } = req.body;

  await Materials.update({ materialName, specification, unit }, { where: { id } });
  res.redirect('/manage-materials');
});

// 자재 삭제 처리
app.post('/delete-material/:id', async (req, res) => {
  const { id } = req.params;
  await Materials.destroy({ where: { id } });
  res.redirect('/manage-materials');
});

// 자재 입력 페이지 라우트
app.get('/input-materials', async (req, res) => {
  try {
    const materialsList = await Materials.findAll({
      attributes: ['materialName', 'unit'],
      group: ['materialName', 'unit'],
      order: [['materialName', 'ASC']],
    });

    const materialSpecifications = {};
    for (let material of materialsList) {
      const specifications = await Materials.findAll({
        where: { materialName: material.materialName },
        attributes: ['id', 'specification'],
        order: [[sequelize.literal("CAST(specification AS INTEGER)"), 'ASC']],
      });
      materialSpecifications[material.materialName] = specifications.map(spec => ({
        id: spec.id,
        specification: spec.specification,
      }));
    }

    res.render('input-materials', { materials: materialsList, materialSpecifications });
  } catch (error) {
    console.error('Error fetching materials:', error);
    res.status(500).send('자재 목록을 불러오는 중 오류가 발생했습니다.');
  }
});

// 자재 입력 처리 라우트
app.post('/input-materials', async (req, res) => {
  try {
    const { date, materialIds, quantities } = req.body;

    if (!materialIds || !quantities) {
      return res.status(400).send('자재와 수량을 입력해야 합니다.');
    }

    const materialIdArray = Array.isArray(materialIds) ? materialIds : [materialIds];
    const quantityArray = Array.isArray(quantities) ? quantities : [quantities];

    for (let i = 0; i < materialIdArray.length; i++) {
      const materialId = materialIdArray[i];
      const quantity = quantityArray[i];

      if (!materialId || !quantity || isNaN(quantity)) {
        return res.status(400).send('유효하지 않은 자재 또는 수량이 입력되었습니다.');
      }

      const material = await Materials.findByPk(materialId);
      if (!material) {
        return res.status(404).send(`자재 ID ${materialId}을(를) 찾을 수 없습니다.`);
      }

      await DailyMaterials.create({
        date: date,
        materialId: materialId,
        quantity: quantity,
      });
    }

    res.send("<script>alert('완료되었습니다.'); window.location.href='/input-materials';</script>");
  } catch (error) {
    console.error('Error saving material data:', error);
    res.status(500).send('자재 데이터를 저장하는 중 오류가 발생했습니다.');
  }
});

// 장비 관리 페이지 라우트
app.get('/manage-equipments', async (req, res) => {
  const equipmentsList = await Equipments.findAll();

  equipmentsList.sort((a, b) => {
    const nameA = a.equipmentName;
    const nameB = b.equipmentName;
    if (nameA < nameB) return -1;
    if (nameA > nameB) return 1;

    const specA = parseInt(a.specification.replace(/[^0-9]/g, '')) || 0;
    const specB = parseInt(b.specification.replace(/[^0-9]/g, '')) || 0;

    return specA - specB;
  });

  res.render('manage-equipments', { equipments: equipmentsList });
});

// 장비 추가 처리
app.post('/add-equipment', async (req, res) => {
  const { equipmentName, specification } = req.body;

  await Equipments.create({ equipmentName, specification });
  res.redirect('/manage-equipments');
});

// 장비 수정 페이지 라우트
app.get('/update-equipment/:id', async (req, res) => {
  const { id } = req.params;
  const equipment = await Equipments.findByPk(id);
  res.render('update-equipment', { equipment });
});

// 장비 수정 처리
app.post('/update-equipment/:id', async (req, res) => {
  const { id } = req.params;
  const { equipmentName, specification } = req.body;

  await Equipments.update({ equipmentName, specification }, { where: { id } });
  res.redirect('/manage-equipments');
});

// 장비 삭제 처리
app.post('/delete-equipment/:id', async (req, res) => {
  const { id } = req.params;
  await Equipments.destroy({ where: { id } });
  res.redirect('/manage-equipments');
});

app.get('/ManpowerFinalPaper', async (req, res) => {
  try {
    const selectedDate = req.query.date || new Date().toISOString().split('T')[0];
    const previousDate = new Date(new Date(selectedDate).setDate(new Date(selectedDate).getDate() - 1));
    const formattedPreviousDate = previousDate.toISOString().split('T')[0];
    const maxRows = 40; // 표시할 최대 행의 수

    // 현장명을 데이터베이스에서 가져오기
    const site = await Site.findOne(); // 가장 첫 번째 현장명을 가져오는 예시입니다.
    const siteName = site ? site.siteName : "공사명"; // 만약 데이터가 없으면 기본값으로 "공사명" 사용

    // 날씨 데이터 가져오기
    let weatherData = await Weather.findOne({ where: { date: selectedDate } });

    if (!weatherData) {
      // 선택한 날짜가 오늘이라면, API를 호출하여 날씨 데이터를 가져옵니다.
      const today = new Date().toISOString().split('T')[0];
      if (selectedDate === today) {
        await getWeatherData();
        weatherData = await Weather.findOne({ where: { date: selectedDate } });
      } else {
        console.log(`${selectedDate}의 날씨 데이터가 없습니다.`);
      }
    }

    const weather = weatherData ? weatherData.weatherCondition : '정보 없음';
    const lowTemp = weatherData ? `${weatherData.minTemp} °C` : '정보 없음';
    const highTemp = weatherData ? `${weatherData.maxTemp} °C` : '정보 없음';


    // 모든 자재, 장비, 업체 목록을 미리 가져옵니다.
    const allMaterials = await Materials.findAll({
      order: [['id', 'ASC']]
    });

    const allEquipments = await Equipments.findAll({
      order: [['id', 'ASC']]
    });

    const allCompanies = await Companies.findAll({
      order: [['id', 'ASC']]
    });

    // 선택한 날짜까지의 데이터 쿼리
    const cumulativeMaterials = await DailyMaterials.findAll({
      include: [{ model: Materials, as: 'materialDetails' }],
      where: { date: { [Op.lte]: selectedDate } },
      order: [['materialId', 'ASC']]
    });

    const cumulativeWorkDetails = await WorkDetails.findAll({
      include: [{ model: Companies, as: 'companyDetails' }],
      where: { date: { [Op.lte]: selectedDate } },
      order: [['companyId', 'ASC']]
    });

    const cumulativeEquipments = await WorkEquipments.findAll({
      include: [
        { model: Equipments, as: 'equipment' },
        { model: WorkDetails, as: 'workDetail', where: { date: { [Op.lte]: selectedDate } } }
      ],
      order: [['equipmentId', 'ASC']]
    });

    // 자재, 장비, 업체 각각 전일-금일-누계 데이터를 처리
    const groupedMaterials = {};
    const groupedEquipments = {};
    const groupedWorkDetails = {};

    // 모든 자재 기본 값 설정
    allMaterials.forEach(material => {
      const key = `${material.materialName}-${material.specification}`;
      groupedMaterials[key] = {
        materialDetails: material,
        previousQuantity: 0,
        currentQuantity: 0,
        totalQuantity: 0 // 누적 합계
      };
    });

    // 누적 자재 데이터 처리
    cumulativeMaterials.forEach(material => {
      const key = `${material.materialDetails.materialName}-${material.materialDetails.specification}`;
      if (groupedMaterials[key]) {
        groupedMaterials[key].totalQuantity += material.quantity; // 누적 합계
        if (material.date === selectedDate) {
          groupedMaterials[key].currentQuantity = material.quantity; // 금일 자재량
        } else if (material.date === formattedPreviousDate) {
          groupedMaterials[key].previousQuantity = material.quantity; // 전일 자재량
        }
      }
    });

    // 모든 장비 기본 값 설정
    allEquipments.forEach(equipment => {
      const key = `${equipment.equipmentName}-${equipment.specification}`;
      groupedEquipments[key] = {
        equipment: equipment,
        previousUsage: 0,
        currentUsage: 0,
        totalUsage: 0 // 누적 합계
      };
    });

    // 누적 장비 데이터 처리
    cumulativeEquipments.forEach(equipment => {
      const key = `${equipment.equipment.equipmentName}-${equipment.equipment.specification}`;
      if (groupedEquipments[key]) {
        groupedEquipments[key].totalUsage += equipment.equipmentCount; // 누적 합계
        if (equipment.workDetail.date === selectedDate) {
          groupedEquipments[key].currentUsage = equipment.equipmentCount; // 금일 장비 사용량
        } else if (equipment.workDetail.date === formattedPreviousDate) {
          groupedEquipments[key].previousUsage = equipment.equipmentCount; // 전일 사용량
        }
      }
    });

    // 모든 업체 기본 값 설정
    allCompanies.forEach(company => {
      const key = `${company.company}-${company.trade}`;
      groupedWorkDetails[key] = {
        companyDetails: company,
        previousPersonnel: 0,
        currentPersonnel: 0,
        totalPersonnel: 0 // 누적 합계
      };
    });

    // 누적 업체 데이터 처리
    cumulativeWorkDetails.forEach(workDetail => {
      const key = `${workDetail.companyDetails.company}-${workDetail.companyDetails.trade}`;
      if (groupedWorkDetails[key]) {
        groupedWorkDetails[key].totalPersonnel += workDetail.personnel_count; // 누적 합계
        if (workDetail.date === selectedDate) {
          groupedWorkDetails[key].currentPersonnel = workDetail.personnel_count; // 금일 출력
        } else if (workDetail.date === formattedPreviousDate) {
          groupedWorkDetails[key].previousPersonnel = workDetail.personnel_count; // 전일 출력
        }
      }
    });

    // 각 workDetail에 대해 선택된 날짜의 금일 출력 계산
    Object.values(groupedWorkDetails).forEach(detail => {
      detail.calculatePersonnelForSelectedDate = detail.currentPersonnel;
    });

    // 선택된 날짜의 출력 인원만 계산하는 함수
    const calculatePersonnelForSelectedDate = (workDetails, selectedDate) => {
      return workDetails.reduce((total, workDetail) => {
        if (workDetail.date === selectedDate) {
          return total + workDetail.personnel_count;
        }
        return total;
      }, 0);
    };

    // 누계 출력 인원 합계 계산
    const totalPersonnelToday = cumulativeWorkDetails.reduce((total, work) => {
      if (work.date === selectedDate) {
        return total + work.personnel_count;
      }
      return total;
    }, 0);

    // 전일 출력 인원 합계 계산
    const totalPersonnelPreviousDay = cumulativeWorkDetails.reduce((total, work) => {
      if (work.date === formattedPreviousDate) {
        return total + work.personnel_count;
      }
      return total;
    }, 0);

    // 누적 출력 인원 합계 계산 (선택된 날짜까지)
    const totalPersonnelCumulative = cumulativeWorkDetails.reduce((total, work) => {
      return total + work.personnel_count;
    }, 0);

    // 총 출력할 행 수 계산
    const totalRows = Math.max(
      Object.values(groupedMaterials).length,
      Object.values(groupedEquipments).length,
      Object.values(groupedWorkDetails).length
    );

    // 빈칸 채우기 위해 필요한 행 수 계산
    const emptyRows = maxRows - totalRows;

    res.render('ManpowerFinalPaper', {
      siteName,
      workDate: selectedDate,
      weather,
      lowTemp,
      highTemp,
      materials: Object.values(groupedMaterials),
      equipments: Object.values(groupedEquipments),
      workDetails: Object.values(groupedWorkDetails),
      totalPersonnelToday,
      totalPersonnelPreviousDay,
      totalPersonnelCumulative,
      maxRows, // maxRows 전송
      emptyRows // 빈칸 채우기 위한 행 수
    });
  } catch (error) {
    console.error('Error fetching data:', error);
    res.status(500).send('Error fetching data');
  }
});


// WorkStatusFinalPaper 라우트
app.get('/WorkStatusFinalPaper', async (req, res) => {
  try {
    const selectedDate = req.query.date || new Date().toISOString().split('T')[0];
    const previousDate = new Date(new Date(selectedDate).setDate(new Date(selectedDate).getDate() - 1));
    const maxRows = 95; // 필요한 경우 사용

    // 현장명을 데이터베이스에서 가져오기
    const site = await Site.findOne(); // 가장 첫 번째 현장명을 가져오는 예시입니다.
    const siteName = site ? site.siteName : "공사명"; // 만약 데이터가 없으면 기본값으로 "공사명" 사용

    //날씨
    // 날씨 데이터 가져오기
    let weatherData = await Weather.findOne({ where: { date: selectedDate } });

    if (!weatherData) {
      // 선택한 날짜가 오늘이라면, API를 호출하여 날씨 데이터를 가져옵니다.
      const today = new Date().toISOString().split('T')[0];
      if (selectedDate === today) {
        await getWeatherData();
        weatherData = await Weather.findOne({ where: { date: selectedDate } });
      } else {
        console.log(`${selectedDate}의 날씨 데이터가 없습니다.`);
      }
    }

    const weather = weatherData ? weatherData.weatherCondition : '정보 없음';
    const lowTemp = weatherData ? `${weatherData.minTemp} °C` : '정보 없음';
    const highTemp = weatherData ? `${weatherData.maxTemp} °C` : '정보 없음';


    // 작업사항
    const workDetails = await WorkDetails.findAll({
      include: [{ model: Companies, as: 'companyDetails' }],
      where: { date: selectedDate },
      attributes: ['description', 'companyId'], // description 필드로 수정
      order: [['companyId', 'ASC']]
    });
    
    
    const previousWorkDetails = await WorkDetails.findAll({
      include: [{ model: Companies, as: 'companyDetails' }],
      where: { date: previousDate.toISOString().split('T')[0] },
      attributes: ['description', 'companyId'], // 명시적으로 필드 추가
      order: [['companyId', 'ASC']]
    });

    

    // 렌더링할 템플릿에 필요한 데이터 전달
    res.render('WorkStatusFinalPaper', {
      siteName,
      workDate: selectedDate,
      weather,
      lowTemp,
      highTemp,
      workDetails, // 선택된 날짜의 작업 현황
      previousWorkDetails, // 전일 작업 현황
      maxRows, // 필요 시 사용
    });
  } catch (error) {
    console.error('Error fetching data:', error);
    res.status(500).send('Error fetching data');
  }
});

//날씨 api
// 날씨 데이터베이스 초기화 라우트 추가
app.get('/reset-weather-database', async (req, res) => {
  try {
    await Weather.sync({ force: true });
    console.log('Weather table has been reset and recreated!');
    res.send('날씨 데이터베이스가 초기화되었습니다.');
  } catch (error) {
    console.error('Error resetting the weather table:', error);
    res.status(500).send('날씨 데이터베이스 초기화 중 오류가 발생했습니다.');
  }
});




// 기존의 getWeatherData 함수 수정
async function getWeatherData() {
  const serviceKey = '5d%2FuSBS9DyxFodVGV5jsPfu2rnCycumgAN4iHkwDqA79ETt3Ss1fLHghWNlacVFufLTHj8R53ON%2FZULQbPKhEQ%3D%3D'; // 발급받은 서비스 키를 입력하세요.
  const decodedServiceKey = decodeURIComponent(serviceKey); // 서비스 키 디코딩
  const url = 'http://apis.data.go.kr/1360000/VilageFcstInfoService_2.0/getVilageFcst';

  // 현재 날짜와 시간을 구합니다.
  const date = new Date();
  let baseDate = date.toISOString().split('T')[0].replace(/-/g, '');
  let hours = date.getHours();

  // API 제공 시간에 맞게 baseTime 설정
  let baseTime;
  if (hours >= 2 && hours < 5) {
    baseTime = '0200';
  } else if (hours >= 5 && hours < 8) {
    baseTime = '0500';
  } else if (hours >= 8 && hours < 11) {
    baseTime = '0800';
  } else if (hours >= 11 && hours < 14) {
    baseTime = '1100';
  } else if (hours >= 14 && hours < 17) {
    baseTime = '1400';
  } else if (hours >= 17 && hours < 20) {
    baseTime = '1700';
  } else if (hours >= 20 && hours < 23) {
    baseTime = '2000';
  } else {
    baseTime = '2300';
    // 자정 이후에는 baseDate를 전날로 변경
    baseDate = new Date(date.setDate(date.getDate() - 1)).toISOString().split('T')[0].replace(/-/g, '');
  }

  // 수원시의 격자 좌표
  const nx = 60;
  const ny = 121;

  const queryParams = '?' + querystring.stringify({
    ServiceKey: decodedServiceKey,
    pageNo: '1',
    numOfRows: '1000',
    dataType: 'JSON',
    base_date: baseDate,
    base_time: baseTime,
    nx: nx,
    ny: ny,
  });

  try {
    const response = await axios.get(url + queryParams);
    const items = response.data.response.body.items.item;

    // 필요한 데이터 필터링
    const weatherData = {};

    items.forEach(item => {
      if (item.category === 'TMN') {
        weatherData.minTemp = item.fcstValue; // 최저기온
      }
      if (item.category === 'TMX') {
        weatherData.maxTemp = item.fcstValue; // 최고기온
      }
      if (item.category === 'SKY' && !weatherData.weatherCondition) {
        const skyStatus = {
          '1': '맑음',
          '3': '구름 많음',
          '4': '흐림',
        };
        weatherData.weatherCondition = skyStatus[item.fcstValue];
      }
      if (item.category === 'PTY' && item.fcstValue !== '0') {
        const ptyStatus = {
          '1': '비',
          '2': '비/눈',
          '3': '눈',
          '4': '소나기',
        };
        weatherData.weatherCondition = ptyStatus[item.fcstValue];
      }
    });

    // 날짜를 'YYYY-MM-DD' 형식으로 변환
    const today = new Date().toISOString().split('T')[0];

    // Weather 테이블에 데이터 저장
    await Weather.create({
      date: today,
      minTemp: weatherData.minTemp || '-',
      maxTemp: weatherData.maxTemp || '-',
      weatherCondition: weatherData.weatherCondition || '정보 없음',
    });

    console.log('날씨 데이터가 데이터베이스에 저장되었습니다.');

    return weatherData;
  } catch (error) {
    console.error('API 호출 중 오류 발생:', error);
    return null;
  }
}

//현장명 관리

// 현장명 관리 페이지 라우트
app.get('/manage-sites', async (req, res) => {
  const sites = await Site.findAll({ order: [['siteName', 'ASC']] });
  res.render('manage', { sites });
});

// 현장명 추가 처리
app.post('/add-site', async (req, res) => {
  const { siteName } = req.body;
  await Site.create({ siteName });
  res.redirect('/manage');
});

// 현장명 수정 처리
app.post('/update-site/:id', async (req, res) => {
  const { id } = req.params;
  const { siteName } = req.body;
  await Site.update({ siteName }, { where: { id } });
  res.redirect('/manage');
});

// 현장명 삭제 처리
app.post('/delete-site/:id', async (req, res) => {
  const { id } = req.params;
  await Site.destroy({ where: { id } });
  res.redirect('/manage');
});

//기상청 api 넣기
// API 키 추가
app.post('/add-api-key', async (req, res) => {
  try {
    const { apiKey } = req.body;
    await APIKeys.create({ apiKey });
    res.redirect('/manage'); // 성공적으로 추가 후 manage 페이지로 리다이렉트
  } catch (error) {
    console.error('Error adding API key:', error);
    res.status(500).send('API 키 추가 중 오류가 발생했습니다.');
  }
});

// API 키 수정
app.post('/update-api-key/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { apiKey } = req.body;
    await APIKeys.update({ apiKey }, { where: { id } });
    res.redirect('/manage'); // 성공적으로 수정 후 manage 페이지로 리다이렉트
  } catch (error) {
    console.error('Error updating API key:', error);
    res.status(500).send('API 키 수정 중 오류가 발생했습니다.');
  }
});

// API 키 삭제
app.post('/delete-api-key/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await APIKeys.destroy({ where: { id } });
    res.redirect('/manage'); // 성공적으로 삭제 후 manage 페이지로 리다이렉트
  } catch (error) {
    console.error('Error deleting API key:', error);
    res.status(500).send('API 키 삭제 중 오류가 발생했습니다.');
  }
});

//sqlite를 직접 다운로드
// SQLite DB 파일 다운로드 라우트
app.get('/download-sqlite', (req, res) => {
  const dbPath = path.join(__dirname, 'database.sqlite'); // SQLite DB 파일 경로

  // 파일이 존재하는지 확인
  fs.access(dbPath, fs.constants.F_OK, (err) => {
    if (err) {
      console.error('SQLite 파일이 존재하지 않습니다:', err);
      return res.status(404).send('SQLite 파일을 찾을 수 없습니다.');
    }

    // 파일 다운로드 제공
    res.download(dbPath, 'database.sqlite', (err) => {
      if (err) {
        console.error('파일 전송 중 오류가 발생했습니다:', err);
        res.status(500).send('파일을 전송하는 중 오류가 발생했습니다.');
      }
    });
  });
});



// 서버 실행
app.listen(3000, () => {
  console.log('Server is running on port 3000');
});
