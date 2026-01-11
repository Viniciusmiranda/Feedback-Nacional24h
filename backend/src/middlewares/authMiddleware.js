const jwt = require('jsonwebtoken');
const http = require('http');

const logDebug = (location, message, data, hypothesisId) => {
    const payload = JSON.stringify({location,message,data,timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId});
    const options = {hostname:'127.0.0.1',port:7242,path:'/ingest/b413d7a1-ab2f-4087-9d24-a3a94b57ef53',method:'POST',headers:{'Content-Type':'application/json'}};
    const req = http.request(options,()=>{});req.on('error',()=>{});req.write(payload);req.end();
};

module.exports = (req, res, next) => {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    // #region agent log
    logDebug('authMiddleware.js:4','authMiddleware iniciado',{hasToken:!!token,tokenLength:token?.length,path:req.path},'B');
    // #endregion

    if (!token) {
        // #region agent log
        logDebug('authMiddleware.js:7','Token não fornecido',{path:req.path},'B');
        // #endregion
        return res.status(401).json({ error: 'Acesso negado. Token não fornecido.' });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        // #region agent log
        logDebug('authMiddleware.js:12','Token válido',{userId:decoded.id,userRole:decoded.role,userCompanyId:decoded.companyId},'B');
        // #endregion
        req.user = decoded; // { id, role, companyId }
        next();
    } catch (err) {
        // #region agent log
        logDebug('authMiddleware.js:15','Token inválido',{errorMessage:err.message},'B');
        // #endregion
        res.status(400).json({ error: 'Token inválido.' });
    }
};
