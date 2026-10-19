#!/usr/bin/env node
/**
 * Generate local QR PNGs for the static newsletter archive without a package
 * dependency or an external QR service. macOS CoreImage creates the code and
 * Vision decodes each result again before it is retained.
 */
import { mkdtempSync, mkdirSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

const root = process.cwd();
const source = resolve(root, 'src/content/newsletters');
const destination = resolve(root, 'public/share');
const ogDestination = resolve(destination, 'og');
const temporary = mkdtempSync(join(tmpdir(), 'jvyin-share-'));
const swiftFile = join(temporary, 'qr.swift');
const ogSwiftFile = join(temporary, 'og.swift');

const swift = String.raw`
import AppKit
import Foundation
import Vision

let arguments = CommandLine.arguments
guard arguments.count == 3 else { exit(64) }
let content = arguments[1]
let target = URL(fileURLWithPath: arguments[2])
guard let data = content.data(using: .utf8),
      let filter = CIFilter(name: "CIQRCodeGenerator") else { exit(65) }
filter.setValue(data, forKey: "inputMessage")
filter.setValue("M", forKey: "inputCorrectionLevel")
guard let code = filter.outputImage else { exit(66) }
let image = code.transformed(by: CGAffineTransform(scaleX: 12, y: 12))
let size = NSSize(width: image.extent.width, height: image.extent.height)
let nsImage = NSImage(size: size)
nsImage.lockFocus()
NSGraphicsContext.current?.imageInterpolation = .none
NSCIImageRep(ciImage: image).draw(in: NSRect(origin: .zero, size: size))
nsImage.unlockFocus()
guard let tiff = nsImage.tiffRepresentation,
      let bitmap = NSBitmapImageRep(data: tiff),
      let png = bitmap.representation(using: .png, properties: [:]) else { exit(68) }
try png.write(to: target)

let request = VNDetectBarcodesRequest()
let handler = VNImageRequestHandler(url: target)
try handler.perform([request])
guard request.results?.contains(where: { $0.payloadStringValue == content }) == true else { exit(67) }
`;

const ogSwift = String.raw`
import AppKit
import Foundation

let arguments = CommandLine.arguments
guard arguments.count == 6 else { exit(64) }
let target = URL(fileURLWithPath: arguments[1])
let title = arguments[2]
let subtitle = arguments[3]
let date = arguments[4]
let label = arguments[5]
let size = NSSize(width: 1200, height: 630)
guard let bitmap = NSBitmapImageRep(bitmapDataPlanes: nil, pixelsWide: 1200, pixelsHigh: 630, bitsPerSample: 8, samplesPerPixel: 4, hasAlpha: true, isPlanar: false, colorSpaceName: .deviceRGB, bytesPerRow: 0, bitsPerPixel: 0),
      let graphics = NSGraphicsContext(bitmapImageRep: bitmap) else { exit(65) }
NSGraphicsContext.saveGraphicsState()
NSGraphicsContext.current = graphics
NSColor.white.setFill()
NSBezierPath(rect: NSRect(origin: .zero, size: size)).fill()
NSColor(calibratedRed: 0.73, green: 0.29, blue: 0.08, alpha: 1).setFill()
NSBezierPath(roundedRect: NSRect(x: 78, y: 490, width: 134, height: 7), xRadius: 3.5, yRadius: 3.5).fill()

let titleStyle: [NSAttributedString.Key: Any] = [.font: NSFont.systemFont(ofSize: 58, weight: .bold), .foregroundColor: NSColor(calibratedWhite: 0.10, alpha: 1)]
let subtitleStyle: [NSAttributedString.Key: Any] = [.font: NSFont.systemFont(ofSize: 27, weight: .regular), .foregroundColor: NSColor(calibratedWhite: 0.38, alpha: 1)]
let labelStyle: [NSAttributedString.Key: Any] = [.font: NSFont.monospacedSystemFont(ofSize: 20, weight: .medium), .foregroundColor: NSColor(calibratedRed: 0.73, green: 0.29, blue: 0.08, alpha: 1)]
let footerStyle: [NSAttributedString.Key: Any] = [.font: NSFont.systemFont(ofSize: 20, weight: .regular), .foregroundColor: NSColor(calibratedWhite: 0.45, alpha: 1)]
(label as NSString).draw(at: NSPoint(x: 78, y: 530), withAttributes: labelStyle)
(title as NSString).draw(in: NSRect(x: 78, y: 295, width: 900, height: 175), withAttributes: titleStyle)
(subtitle as NSString).draw(in: NSRect(x: 78, y: 185, width: 880, height: 92), withAttributes: subtitleStyle)
("jvyin.com  ·  " + date as NSString).draw(at: NSPoint(x: 78, y: 70), withAttributes: footerStyle)
NSColor(calibratedRed: 0.73, green: 0.29, blue: 0.08, alpha: 1).setFill()
NSBezierPath(ovalIn: NSRect(x: 1050, y: 70, width: 72, height: 72)).fill()
NSGraphicsContext.restoreGraphicsState()
guard let png = bitmap.representation(using: .png, properties: [:]) else { exit(66) }
try png.write(to: target)
`;

try {
  writeFileSync(swiftFile, swift);
  writeFileSync(ogSwiftFile, ogSwift);
  mkdirSync(destination, { recursive: true });
  mkdirSync(ogDestination, { recursive: true });
  const newsletterIds = readdirSync(source)
    .filter((name) => /^\d{3}\.md$/.test(name))
    .map((name) => name.slice(0, -3))
    .sort();
  const ids = [...newsletterIds, 'agents', 'onchain-finance', 'hyperliquid-builders'];

  for (const id of process.argv.includes('--og-only') ? [] : ids) {
    const url = newsletterIds.includes(id)
      ? `https://jvyin.com/newsletter/${id}/`
      : id === 'hyperliquid-builders'
        ? 'https://jvyin.com/research/hyperliquid-builders/'
        : `https://jvyin.com/${id}/`;
    const file = resolve(destination, `${id}.png`);
    execFileSync('swift', [swiftFile, url, file], { stdio: 'inherit' });
    console.log(`Verified QR: ${url}`);
  }

  const ogCards = [
    ['site', 'jvyin', 'AI Agent-Native Onchain Finance | Research • Build • Invest', '2026', 'RESEARCH / BUILD / INVEST'],
    ['agents', 'AI agents', 'Claude、GPT、DeepSeek、Grok Bot。追踪前沿产品、公开数据与一手资讯。', '2026-10-19', 'AI / PRODUCTS / DATA / NEWS'],
    ['onchain-finance', '链上金融', '从稳定币、交易和借贷到 RWA，理解链上金融的资产、市场结构与关键数据。', '2026-10-18', 'RESEARCH OBSERVATORY / 02'],
    ['hyperliquid-builders', '死掉的 Hyperliquid 前端', '谁在收 builder fee，收了几个 bps，费用归谁，以及前端回落背后的不同路径。', '2026-10-18', 'RESEARCH NOTE'],
  ];
  for (const [id, title, subtitle, date, label] of ogCards) {
    execFileSync('swift', [ogSwiftFile, resolve(ogDestination, `${id}.png`), title, subtitle, date, label], { stdio: 'inherit' });
    console.log(`Generated OG: ${id}`);
  }
  writeFileSync(resolve(destination, 'qr-verification.json'), `${JSON.stringify({
    generatedAt: new Date().toISOString(),
    verifier: 'macOS Vision VNDetectBarcodesRequest',
    assets: ids.map((id) => ({
      id,
      file: `/share/${id}.png`,
      url: newsletterIds.includes(id)
        ? `https://jvyin.com/newsletter/${id}/`
        : id === 'hyperliquid-builders'
          ? 'https://jvyin.com/research/hyperliquid-builders/'
          : `https://jvyin.com/${id}/`,
    })),
  }, null, 2)}\n`);
} finally {
  rmSync(temporary, { recursive: true, force: true });
}
