import passport from 'passport';
import GitHubStrategy from 'passport-github2'
import jwt from "passport-jwt";
import userModel from "../dao/models/users.model.js";
import 'dotenv/config.js'

const strategyJWT = jwt.Strategy;
const extractJWT = jwt.ExtractJwt;
const cookieExtractor = (req) => {
  let token = null;
  if(req && req.cookies) {
    token = req.cookies['userToken']
  };
  return token
};

const initPassport = () => {
  passport.use('jwt', new strategyJWT({
    jwtFromRequest: extractJWT.fromExtractors([cookieExtractor]),
    secretOrKey: process.env.privateKey
  }, async (jwt_payload, done) => {
    try {
      return done(null, jwt_payload)
    } catch (error) {
        return done(error)
    }
  }));

  passport.use('github', new GitHubStrategy({
    clientID: process.env.gitClientId,
    clientSecret: process.env.gitClientSecret,
    callbackURL: process.env.gitCallbackUrl
  }, async (accessToken, refreshToken, profile, done) => {
    try {
      console.log(profile)
      let user = await userModel.findOne({ email: profile._json.email });
      if (!user) {
        const userNew = {
          first_name: profile._json.name,
          last_name: '',
          age: '',
          email: profile._json.email,
          password: ''
        };
        const newUser = await userModel.create(userNew);
        return done(null, newUser);
      };

      done(null, user);
    } catch (error) {
      done(error);
    }
  }));

  passport.serializeUser((user, done) => {
    done(null, user._id);
  });

  passport.deserializeUser(async (id, done) => {
    let user = await userModel.findById(id);
    done(null, user);
  });
};

export default initPassport;
