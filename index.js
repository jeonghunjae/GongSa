const express = require('express');
const { Sequelize, DataTypes } = require('sequelize');
const path = require('path');

const app = express();

// 뷰 엔진 및 정적 파일 설정
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// SQLite 데이터베이스 설정
const sequelize = new Sequelize({
  dialect: 'sqlite',
  storage: path.join(__dirname, 'database.sqlite')
});

// 테이블 정의
const Companies = sequelize.define('companies', {
  company: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  trade: {
    type: DataTypes.STRING,
    allowNull: false,
  }
});

const WorkDetails = sequelize.define('work_details', {
  date: {
    type: DataTypes.DATEONLY,
    allowNull: false,
  },
  companyId: {
    type: DataTypes.INTEGER,
    references: {
      model: Companies,
      key: 'id'
    },
    allowNull: false
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

// 관계 정의
WorkDetails.belongsTo(Companies, { foreignKey: 'companyId', as: 'companyDetails' });

// 데이터베이스 초기화
(async () => {
  await sequelize.sync(); // 데이터베이스 재설정
  console.log('All tables have been (re)created!');
})();

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
  const companiesList = await Companies.findAll({ order: [['company', 'ASC']] });
  res.render('input', { companies: companiesList });
});

// In your server code (e.g., index.js)
app.get('/success', (req, res) => {
  res.render('success');
});


app.post('/create', async (req, res) => {
  try {
    const { date, companyId, personnel_count, description } = req.body;

    // 새로운 작업 세부 사항 추가
    await WorkDetails.create({
      date,
      companyId, // 회사의 외래 키를 저장
      personnel_count,
      description
    });

    res.redirect('/success'); // 성공 페이지로 리디렉션
  } catch (error) {
    console.error('Error creating work details:', error);
    res.status(500).send('작업 세부 사항을 추가하는 중 오류가 발생했습니다.');
  }
});


// 관리 페이지 라우트
app.get('/manage', async (req, res) => {
  const { date, company } = req.query;

  // 모든 업체 리스트 가져오기
  const companiesList = await Companies.findAll({ order: [['company', 'ASC']] });

  // 작성된 공사일보 정보와 해당 업체 정보 JOIN
  const writtenCompanies = await WorkDetails.findAll({
    where: { ...(date && { date }) },
    include: [{ model: Companies, as: 'companyDetails' }],
    order: [['companyId', 'ASC']]
  });

  // 작성된 업체 ID 목록 추출
  const writtenCompanyIds = writtenCompanies.map(work => work.companyId);

  // 작성되지 않은 업체 목록 구하기
  const notWrittenCompanies = await Companies.findAll({
    where: {
      id: { [Sequelize.Op.notIn]: writtenCompanyIds }
    },
    order: [['company', 'ASC']]
  });

  res.render('manage', { companies: companiesList, writtenCompanies, notWrittenCompanies });
});

app.get('/reset-database', async (req, res) => {
  try {
    // work_details 테이블만 삭제하고 다시 생성
    await WorkDetails.sync({ force: true }); // work_details 테이블을 초기화

    console.log('work_details table has been reset and recreated!');
    
    res.redirect('/manage');
  } catch (error) {
    console.error('Error resetting the work_details table:', error);
    res.status(500).send('work_details 테이블 초기화 중 오류가 발생했습니다.');
  }
});


// 서버 실행
app.listen(3000, () => {
  console.log('Server is running on port 3000');
});
