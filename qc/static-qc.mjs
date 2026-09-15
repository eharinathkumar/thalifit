import fs from 'node:fs';
import { execFileSync } from 'node:child_process';

function fail(msg){console.error(`FAIL: ${msg}`);process.exitCode=1;}
function pass(msg){console.log(`PASS: ${msg}`);}
function read(path){if(!fs.existsSync(path)){fail(`missing ${path}`);return'';}return fs.readFileSync(path,'utf8');}
function count(source,regex){return (source.match(regex)||[]).length;}

const requiredQcFiles=[
  'qc/personas.js',
  'qc/twa.spec.js',
  'qc/server.mjs',
  'qc/fixtures/old-sw.js',
  'qc/fixtures/update-host.html',
  'docs/twa/THALIFY_TWA_MASTER_SOP_AND_ROADMAP_CURRENT.md'
];
for(const file of requiredQcFiles){if(fs.existsSync(file))pass(`required ${file}`);else fail(`missing ${file}`);}

const sw=read('sw.js');
const manifest=JSON.parse(read('manifest.json'));
const version=(sw.match(/const APP_VERSION="([^"]+)"/)||[])[1];
if(version!=='5.6.17')fail(`service-worker version is ${version||'missing'}, expected 5.6.17`);else pass('service-worker version 5.6.17');
if(manifest.start_url!==`./index.html?app=${version}`)fail(`manifest start_url does not match ${version}`);else pass('manifest start_url matches shell version');

const scriptsMatch=sw.match(/const APP_SCRIPTS=(\[[^;]+\]);/);
let scripts=[];
try{scripts=JSON.parse(scriptsMatch?.[1]||'[]')}catch{fail('APP_SCRIPTS is not valid JSON syntax');}
if(!scripts.length)fail('APP_SCRIPTS is empty');
if(scripts.at(-1)!=='twa-v577.js')fail('twa-v577.js must load last');else pass('branded dialog hardening loads last');
for(const file of scripts)if(!fs.existsSync(file))fail(`service worker references missing ${file}`);

for(const file of ['sw.js',...scripts,'qc/static-qc.mjs','qc/server.mjs','qc/fixtures/old-sw.js']){
  try{execFileSync(process.execPath,['--check',file],{stdio:'pipe'});pass(`syntax ${file}`)}catch(e){fail(`syntax ${file}: ${e.stderr?.toString()||e.message}`)}
}

const allowances={
  'index.html':{alert:3,confirm:0,prompt:5},
  'twa-v560.js':{alert:1,confirm:0,prompt:0},
  'twa-v572.js':{alert:0,confirm:1,prompt:0},
  'twa-v574.js':{alert:4,confirm:4,prompt:0}
};
const scanFiles=['index.html',...scripts];
let dialogCountFailed=false;
for(const file of scanFiles){
  const src=read(file);const allow=allowances[file]||{alert:0,confirm:0,prompt:0};
  const got={
    alert:count(src,/\balert\s*\(/g),
    confirm:count(src,/\b(?:window\.)?confirm\s*\(/g),
    prompt:count(src,/\bprompt\s*\(/g)
  };
  for(const k of Object.keys(got)){
    if(got[k]>allow[k]){dialogCountFailed=true;fail(`${file} introduced new native ${k}() call(s): ${got[k]} > allowed legacy ${allow[k]}`);}
  }
}
if(!dialogCountFailed)pass('native-dialog legacy call counts did not increase');

const d=read('twa-v577.js');
for(const needle of ['window.alert=function','window.confirm=function','window.prompt=function','deleteShoppingList','deleteMealPack','updatePackFromReview','updatePackFromMeal','replacePackFromMeal','window.logWeightPrompt=async function','window.logReading=async function','window.editQty=async function','window.__thalifyQC']){
  if(!d.includes(needle))fail(`dialog hardening missing ${needle}`);
}
if(d.includes('eharinathkumar.github.io'))fail('dialog layer must never expose GitHub hostname');else pass('dialog layer contains no GitHub hostname');

const index=read('index.html');
for(const needle of ['function exportData()','function importData(ev)','migrateFoodUnitsInStorage(true)','id="importFile"']){
  if(!index.includes(needle))fail(`backup/restore contract missing ${needle}`);else pass(`backup/restore contract ${needle}`);
}

const browserSpec=read('qc/twa.spec.js');
for(const needle of ['backup → erase local data → restore','old installed PWA upgrades to the current service worker and shell','OLD_CACHE','CURRENT_CACHE']){
  if(!browserSpec.includes(needle))fail(`browser QC missing ${needle}`);else pass(`browser QC covers ${needle}`);
}

if(process.exitCode)process.exit(process.exitCode);
console.log('STATIC TWA QC PASS');
