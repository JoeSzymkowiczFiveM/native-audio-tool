const fs = require('fs');
const path = require('path');
const ffmpeg = require('fluent-ffmpeg');

let fileList = [];
const constructWav = async (filename) => {
    const file = path.parse(filename).name
    const filepath = './convert/'+file+'.mp3';

    return new Promise((resolve, reject)=>{
        ffmpeg()
            .input(filename)
            .inputFormat('ogg')
            .format('mp3')
            .on('error', (err) => {
                console.log('An error occurred: ' + err.message);
                return reject(new Error(err));
            })
            .on('progress', (progress) => {
                console.log('Processing: ' + progress.targetSize + ' KB converted');
            })
            .on('end', async () => {
                console.log('Processing finished !');
                console.log('Generated ', filepath);
                resolve();
            })
            .save(filepath);
    })
};

const main = async () => {
    const customSoundsDir = './convert';
        if (!fs.existsSync(customSoundsDir)) {
            fs.mkdirSync(customSoundsDir);
            console.log('Convert directory created');
        }
    
    fs.readdirSync('./convert').forEach(file => {
        const extension = path.extname(file)
        if (extension === '.ogg') {
            fileList.push(file);
        }
    });

    for (const file of fileList) {
        await constructWav('./convert/'+file);
    }
    
    try {
        
    } catch(e) {
        console.log(e)
        return {operation: false, message: e}
    }
}

main();