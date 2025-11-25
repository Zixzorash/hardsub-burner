'use client';

import { useState, useCallback } from 'react';
import { createFFmpeg, fetchFile } from '@ffmpeg/ffmpeg';
import { Upload, Film, Download, Settings } from 'lucide-react';
import { useDropzone } from 'react-dropzone';

const ffmpeg = createFFmpeg({
  log: false,
  corePath: 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd/ffmpeg-core.js',
});

export default function Home() {
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [subtitleFile, setSubtitleFile] = useState<File | null>(null);
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [detectedFps, setDetectedFps] = useState<string | null>(null);
  const [frameRate, setFrameRate] = useState('auto');

  const [subStyle, setSubStyle] = useState({
    font: 'TH Sarabun New',
    size: 28,
    color: '#FFFFFF',
    outlineColor: '#000000',
    outlineWidth: 3,
    shadow: 3,
    position: 'bottom',
    margin: 40,
  });

  const loadFFmpeg = async () => {
    if (!ffmpeg.isLoaded()) await ffmpeg.load();
  };

  ffmpeg.setProgress(({ ratio }) => setProgress(Math.round(ratio * 100)));

  const detectFPS = async (file: File) => {
    await loadFFmpeg();
    ffmpeg.FS('writeFile', 'temp.mp4', await fetchFile(file));
    try {
      await ffmpeg.run('-i', 'temp.mp4', '-f', 'null', '/dev/null');
      const log = ffmpeg.getLog();
      const fpsMatch = log.match(/, ([\d.]+) fps/);
      if (fpsMatch) setDetectedFps(parseFloat(fpsMatch[1]).toFixed(3));
    } catch (e) {
      setDetectedFps('ไม่สามารถตรวจจับได้');
    }
    ffmpeg.FS('unlink', 'temp.mp4');
  };

  const burn = async () => {
    if (!videoFile) return;
    setProcessing(true);
    setProgress(0);
    await loadFFmpeg();

    ffmpeg.FS('writeFile', 'input.mp4', await fetchFile(videoFile));

    let filter = '';
    if (subtitleFile) {
      const ext = subtitleFile.name.split('.').pop()?.toLowerCase();
      ffmpeg.FS('writeFile', `sub.${ext}`, await fetchFile(subtitleFile));

      const alignment = subStyle.position === 'top' ? 10 : subStyle.position === 'middle' ? 5 : 2;
      const style = `Style: Default,\( {subStyle.font.replace(/ /g, '_')}, \){subStyle.size},&H\( {subStyle.color.slice(1)},&H000000FF,&H \){subStyle.outlineColor.slice(1)},&H80000000,-1,0,0,0,100,100,0,0,1,\( {subStyle.outlineWidth}, \){subStyle.shadow},\( {alignment},30,30, \){subStyle.margin},1`;

      ffmpeg.FS('writeFile', 'style.ass', new TextEncoder().encode(`[V4+ Styles]\nFormat: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding\n${style}`));

      filter = ext === 'ass' 
        ? `subtitles=sub.ass:force_style='MarginV=${subStyle.margin}'`
        : `subtitles=sub.\( {ext}:force_style='FontName= \){subStyle.font},FontSize=\( {subStyle.size},PrimaryColour=&H \){subStyle.color.slice(1)},OutlineColour=&H\( {subStyle.outlineColor.slice(1)},BorderStyle=1,Outline= \){subStyle.outlineWidth},Shadow=\( {subStyle.shadow},Alignment= \){alignment},MarginV=${subStyle.margin}'`;
    }

    if (frameRate !== 'auto') {
      const fps = frameRate === '23.976' ? '24000/1001' : frameRate;
      filter = filter ? `fps=\( {fps}, \){filter}` : `fps=${fps}`;
    }

    await ffmpeg.run(
      '-i', 'input.mp4',
      filter ? '-vf' : '', filter || 'null',
      '-c:v', 'libx264',
      '-crf', '18',
      '-preset', 'fast',
      '-c:a', 'copy',
      'output.mp4'
    );

    const data = ffmpeg.FS('readFile', 'output.mp4');
    const blob = new Blob([data.buffer], { type: 'video/mp4' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `burned_${videoFile.name}`;
    a.click();

    setProcessing(false);
  };

  const onDropVideo = useCallback((files: File[]) => {
    const file = files[0];
    setVideoFile(file);
    detectFPS(file);
  }, []);

  const onDropSub = useCallback((files: File[]) => {
    setSubtitleFile(files[0]);
  }, []);

  const { getRootProps: videoProps, getInputProps: videoInput } = useDropzone({ onDrop: onDropVideo, accept: { 'video/mp4': ['.mp4'] } });
  const { getRootProps: subProps, getInputProps: subInput } = useDropzone({ onDrop: onDropSub, accept: { 'text/*': ['.srt', '.vtt', '.ass'] } });

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-pink-900 to-red-900 p-6">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-5xl font-bold text-white text-center mb-10">HardSub Burner</h1>

        <div {...videoProps()} className="bg-white/10 backdrop-blur rounded-2xl p-8 mb-6 text-center cursor-pointer hover:bg-white/20 transition">
          <input {...videoInput()} />
          <Upload className="w-16 h-16 mx-auto mb-4 text-white" />
          <p className="text-white text-xl">อัปโหลดวิดีโอ MP4 (ไม่จำกัดขนาด)</p>
          {videoFile && <p className="text-green-400 mt-4">เลือกแล้ว: {videoFile.name}</p>}
          {detectedFps && <p className="text-cyan-300 text-sm mt-2">FPS: {detectedFps}</p>}
        </div>

        <div {...subProps()} className="bg-white/10 backdrop-blur rounded-2xl p-8 mb-6 text-center cursor-pointer hover:bg-white/20">
          <input {...subInput()} />
          <p className="text-white text-xl">อัปโหลดซับไตเติ้ล (.srt .vtt .ass)</p>
          {subtitleFile && <p className="text-green-400 mt-4">เลือกแล้ว: {subtitleFile.name}</p>}
        </div>

        <div className="bg-white/10 backdrop-blur rounded-2xl p-8 mb-6 grid md:grid-cols-2 gap-6">
          <div>
            <label className="text-white block mb-2">Frame Rate</label>
            <select value={frameRate} onChange={(e) => setFrameRate(e.target.value)} className="w-full p-3 rounded bg-white/20 text-white">
              <option value="auto">อัตโนมัติ (แนะนำ)</option>
              <option value="23.976">23.976</option>
              <option value="24">24</option>
              <option value="25">25</option>
              <option value="29.97">29.97</option>
              <option value="30 controls">30</option>
              <option value="60">60</option>
            </select>
          </div>
          <div>
            <label className="text-white block mb-2">ตำแหน่งซับ</label>
            <select value={subStyle.position} onChange={(e) => setSubStyle({...subStyle, position: e.target.value})} className="w-full p-3 rounded bg-white/20 text-white">
              <option value="bottom">ล่าง</option>
              <option value="middle">กลาง</option>
              <option value="top">บน</option>
            </select>
          </div>
          <div>
            <label className="text-white block mb-2">สีตัวอักษร</label>
            <input type="color" value={subStyle.color} onChange={(e) => setSubStyle({...subStyle, color: e.target.value})} className="w-full h-12 rounded" />
          </div>
          <div>
            <label className="text-white block mb-2">ขนาดตัวอักษร</label>
            <input type="range" min="16" max="60" value={subStyle.size} onChange={(e) => setSubStyle({...subStyle, size: +e.target.value})} className="w-full" />
            <span className="text-white">{subStyle.size}px</span>
          </div>
        </div>

        <button
          onClick={burn}
          disabled={!videoFile || processing}
          className="w-full bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 disabled:opacity-50 text-white font-bold text-2xl py-6 rounded-2xl flex items-center justify-center gap-4"
        >
          {processing ? (
            <>กำลังประมวลผล... {progress}%</>
          ) : (
            <>เริ่มเบิร์นซับถาวร</>
          )}
        </button>

        <p className="text-white/70 text-center mt-8 text-sm">
          ทำงานในเบราว์เซอร์ของคุณเอง • ไม่มีเซิร์ฟเวอร์ • ปลอดภัย 100%
        </p>
      </div>
    </div>
  );
}
