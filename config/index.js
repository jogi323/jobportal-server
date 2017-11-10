module.exports = {
    secret: process.env.NODE_ENV === 'production' ? 'SilverSmiles' : 'SilverSmiles',
    mongodbUrl: process.env.NODE_ENV === 'production' ? 'mongodb://ashokona:FightClub@ds155325.mlab.com:55325/jobportal' : 'mongodb://ashokona:FightClub@ds155325.mlab.com:55325/jobportal',
    serverUrl: process.env.NODE_ENV === 'production' ? 'https://jobportal5.herokuapp.com/' : 'http://localhost:4200/',
};