module.exports = {
    secret: process.env.NODE_ENV === 'production' ? 'SilverSmiles' : 'SilverSmiles',
    mongodbUrl: process.env.NODE_ENV === 'production' ? 'mongodb://anyday:password@ds129066.mlab.com:29066/anyday' : 'mongodb://ashokona:FightClub@ds155325.mlab.com:55325/jobportal',
    serverUrl: process.env.NODE_ENV === 'production' ? 'https://jobportal5.herokuapp.com/' : 'http://localhost:4200/',
    twilioAccountSid: process.env.NODE_ENV === 'production' ? 'ACe59061ce19c17d5d22f24f4030077216' : 'ACe59061ce19c17d5d22f24f4030077216',
    twilioAuthToken: process.env.NODE_ENV === 'production' ? 'c72ecbf92ae0157e39b97ace69aef668' : 'c72ecbf92ae0157e39b97ace69aef668'
};