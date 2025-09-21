const ExifTags = {
  // version tags
  36864: "ExifVersion", // EXIF version
  40960: "FlashpixVersion", // Flashpix format version

  // colorspace tags
  40961: "ColorSpace", // Color space information tag

  // image configuration
  40962: "PixelXDimension", // Valid width of meaningful image
  40963: "PixelYDimension", // Valid height of meaningful image
  37121: "ComponentsConfiguration", // Information about channels
  37122: "CompressedBitsPerPixel", // Compressed bits per pixel

  // user information
  37500: "MakerNote", // Any desired information written by the manufacturer
  37510: "UserComment", // Comments by user

  // related file
  40964: "RelatedSoundFile", // Name of related sound file

  // date and time
  36867: "DateTimeOriginal", // Date and time when the original image was generated
  36868: "DateTimeDigitized", // Date and time when the image was stored digitally
  37520: "SubsecTime", // Fractions of seconds for DateTime
  37521: "SubsecTimeOriginal", // Fractions of seconds for DateTimeOriginal
  37522: "SubsecTimeDigitized", // Fractions of seconds for DateTimeDigitized

  // picture-taking conditions
  33434: "ExposureTime", // Exposure time (in seconds)
  33437: "FNumber", // F number
  34850: "ExposureProgram", // Exposure program
  34852: "SpectralSensitivity", // Spectral sensitivity
  34855: "ISOSpeedRatings", // ISO speed rating
  34856: "OECF", // Optoelectric conversion factor
  37377: "ShutterSpeedValue", // Shutter speed
  37378: "ApertureValue", // Lens aperture
  37379: "BrightnessValue", // Value of brightness
  37380: "ExposureBias", // Exposure bias
  37381: "MaxApertureValue", // Smallest F number of lens
  37382: "SubjectDistance", // Distance to subject in meters
  37383: "MeteringMode", // Metering mode
  37384: "LightSource", // Kind of light source
  37385: "Flash", // Flash status
  37396: "SubjectArea", // Location and area of main subject
  37386: "FocalLength", // Focal length of the lens in mm
  41483: "FlashEnergy", // Strobe energy in BCPS
  41484: "SpatialFrequencyResponse", //
  41486: "FocalPlaneXResolution", // Number of pixels in width direction per FocalPlaneResolutionUnit
  41487: "FocalPlaneYResolution", // Number of pixels in height direction per FocalPlaneResolutionUnit
  41488: "FocalPlaneResolutionUnit", // Unit for measuring FocalPlaneXResolution and FocalPlaneYResolution
  41492: "SubjectLocation", // Location of subject in image
  41493: "ExposureIndex", // Exposure index selected on camera
  41495: "SensingMethod", // Image sensor type
  41728: "FileSource", // Image source (3 === DSC)
  41729: "SceneType", // Scene type (1 === directly photographed)
  41730: "CFAPattern", // Color filter array geometric pattern
  41985: "CustomRendered", // Special processing
  41986: "ExposureMode", // Exposure mode
  41987: "WhiteBalance", // 1 = auto white balance, 2 = manual
  41988: "DigitalZoomRation", // Digital zoom ratio
  41989: "FocalLengthIn35mmFilm", // Equivalent foacl length assuming 35mm film camera (in mm)
  41990: "SceneCaptureType", // Type of scene
  41991: "GainControl", // Degree of overall image gain adjustment
  41992: "Contrast", // Direction of contrast processing applied by camera
  41993: "Saturation", // Direction of saturation processing applied by camera
  41994: "Sharpness", // Direction of sharpness processing applied by camera
  41995: "DeviceSettingDescription", //
  41996: "SubjectDistanceRange", // Distance to subject

  // other tags
  40965: "InteroperabilityIFDPointer",
  42016: "ImageUniqueID", // Identifier assigned uniquely to each image
} as const;

const TiffTags = {
  256: "ImageWidth",
  257: "ImageHeight",
  34665: "ExifIFDPointer",
  34853: "GPSInfoIFDPointer",
  40965: "InteroperabilityIFDPointer",
  258: "BitsPerSample",
  259: "Compression",
  262: "PhotometricInterpretation",
  274: "Orientation",
  277: "SamplesPerPixel",
  284: "PlanarConfiguration",
  530: "YCbCrSubSampling",
  531: "YCbCrPositioning",
  282: "XResolution",
  283: "YResolution",
  296: "ResolutionUnit",
  273: "StripOffsets",
  278: "RowsPerStrip",
  279: "StripByteCounts",
  513: "JPEGInterchangeFormat",
  514: "JPEGInterchangeFormatLength",
  301: "TransferFunction",
  318: "WhitePoint",
  319: "PrimaryChromaticities",
  529: "YCbCrCoefficients",
  532: "ReferenceBlackWhite",
  306: "DateTime",
  270: "ImageDescription",
  271: "Make",
  272: "Model",
  305: "Software",
  315: "Artist",
  33432: "Copyright",
} as const;

const GPSTags = {
  0: "GPSVersionID",
  1: "GPSLatitudeRef",
  2: "GPSLatitude",
  3: "GPSLongitudeRef",
  4: "GPSLongitude",
  5: "GPSAltitudeRef",
  6: "GPSAltitude",
  7: "GPSTimeStamp",
  8: "GPSSatellites",
  9: "GPSStatus",
  10: "GPSMeasureMode",
  11: "GPSDOP",
  12: "GPSSpeedRef",
  13: "GPSSpeed",
  14: "GPSTrackRef",
  15: "GPSTrack",
  16: "GPSImgDirectionRef",
  17: "GPSImgDirection",
  18: "GPSMapDatum",
  19: "GPSDestLatitudeRef",
  20: "GPSDestLatitude",
  21: "GPSDestLongitudeRef",
  22: "GPSDestLongitude",
  23: "GPSDestBearingRef",
  24: "GPSDestBearing",
  25: "GPSDestDistanceRef",
  26: "GPSDestDistance",
  27: "GPSProcessingMethod",
  28: "GPSAreaInformation",
  29: "GPSDateStamp",
  30: "GPSDifferential",
} as const;

export const Tags: {
  [key: number]: string;
} = {
  ...ExifTags,
  ...TiffTags,
  ...GPSTags,
} as const;

export const StringValues: {
  [key: string]: {
    [key: number]: string;
  };
} = {
  ExposureProgram: {
    0: "Not defined",
    1: "Manual",
    2: "Normal program",
    3: "Aperture priority",
    4: "Shutter priority",
    5: "Creative program",
    6: "Action program",
    7: "Portrait mode",
    8: "Landscape mode",
  },
  MeteringMode: {
    0: "Unknown",
    1: "Average",
    2: "CenterWeightedAverage",
    3: "Spot",
    4: "MultiSpot",
    5: "Pattern",
    6: "Partial",
    255: "Other",
  },
  LightSource: {
    0: "Unknown",
    1: "Daylight",
    2: "Fluorescent",
    3: "Tungsten (incandescent light)",
    4: "Flash",
    9: "Fine weather",
    10: "Cloudy weather",
    11: "Shade",
    12: "Daylight fluorescent (D 5700 - 7100K)",
    13: "Day white fluorescent (N 4600 - 5400K)",
    14: "Cool white fluorescent (W 3900 - 4500K)",
    15: "White fluorescent (WW 3200 - 3700K)",
    17: "Standard light A",
    18: "Standard light B",
    19: "Standard light C",
    20: "D55",
    21: "D65",
    22: "D75",
    23: "D50",
    24: "ISO studio tungsten",
    255: "Other",
  },
  Flash: {
    0: "Flash did not fire",
    1: "Flash fired",
    5: "Strobe return light not detected",
    7: "Strobe return light detected",
    9: "Flash fired, compulsory flash mode",
    13: "Flash fired, compulsory flash mode, return light not detected",
    15: "Flash fired, compulsory flash mode, return light detected",
    16: "Flash did not fire, compulsory flash mode",
    24: "Flash did not fire, auto mode",
    25: "Flash fired, auto mode",
    29: "Flash fired, auto mode, return light not detected",
    31: "Flash fired, auto mode, return light detected",
    32: "No flash function",
    65: "Flash fired, red-eye reduction mode",
    69: "Flash fired, red-eye reduction mode, return light not detected",
    71: "Flash fired, red-eye reduction mode, return light detected",
    73: "Flash fired, compulsory flash mode, red-eye reduction mode",
    77: "Flash fired, compulsory flash mode, red-eye reduction mode, return light not detected",
    79: "Flash fired, compulsory flash mode, red-eye reduction mode, return light detected",
    89: "Flash fired, auto mode, red-eye reduction mode",
    93: "Flash fired, auto mode, return light not detected, red-eye reduction mode",
    95: "Flash fired, auto mode, return light detected, red-eye reduction mode",
  },
  SensingMethod: {
    1: "Not defined",
    2: "One-chip color area sensor",
    3: "Two-chip color area sensor",
    4: "Three-chip color area sensor",
    5: "Color sequential area sensor",
    7: "Trilinear sensor",
    8: "Color sequential linear sensor",
  },
  SceneCaptureType: {
    0: "Standard",
    1: "Landscape",
    2: "Portrait",
    3: "Night scene",
  },
  SceneType: {
    1: "Directly photographed",
  },
  CustomRendered: {
    0: "Normal process",
    1: "Custom process",
  },
  WhiteBalance: {
    0: "Auto white balance",
    1: "Manual white balance",
  },
  GainControl: {
    0: "None",
    1: "Low gain up",
    2: "High gain up",
    3: "Low gain down",
    4: "High gain down",
  },
  Contrast: {
    0: "Normal",
    1: "Soft",
    2: "Hard",
  },
  Saturation: {
    0: "Normal",
    1: "Low saturation",
    2: "High saturation",
  },
  Sharpness: {
    0: "Normal",
    1: "Soft",
    2: "Hard",
  },
  SubjectDistanceRange: {
    0: "Unknown",
    1: "Macro",
    2: "Close view",
    3: "Distant view",
  },
  FileSource: {
    3: "DSC",
  },

  Components: {
    0: "",
    1: "Y",
    2: "Cb",
    3: "Cr",
    4: "R",
    5: "G",
    6: "B",
  },
} as const;
